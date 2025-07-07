import json
import asyncio
from typing import Union
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from app.models.schemas import (
    ChatSessionRequest,
    ChatSessionUpdateRequest,
    ChatMessageRequest,
    SummaryRequest,
    SessionSummaryRequest,
    SummaryResponse,
    SessionSummaryResponse,
    SummaryInsightsResponse,
    ConversationSummary,
    SessionSummary,
    DocumentAnalysisRequest,
    DocumentAnalysisResponse,
    ImageAnalysisRequest,
    ImageAnalysisResponse,
    DocumentCreationRequest,
    DocumentCreationResponse,
    DocumentModificationRequest,
    DocumentModificationResponse,
    ImageCreationRequest,
    ImageCreationResponse,
    ImageModificationRequest,
    ImageModificationResponse,
)
from app.services.ollama_service import ollama_service
from app.services.summarization_service import summarization_service
from app.services.context_service import context_service
from app.services.document_service import document_service
from app.services.image_service import image_service
from app.services.document_creation_service import document_creation_service
from app.services.image_creation_service import image_creation_service
from app.services.websocket_file_handler import WebSocketFileHandler
from app.services.user_info_extractor import user_info_extractor
from app.services.web_search_service import web_search_service
from app.config.settings import settings
from app.services.database_service import database_service

router = APIRouter(prefix="/api", tags=["chat"])


@router.websocket("/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("INFO: connection open")
    
    # Initialize stop event for the entire connection lifecycle
    stop_analysis_event = asyncio.Event()
    
    try:
        while True:
            # Check if connection is still open before receiving
            if websocket.client_state.value >= 3:  # WebSocket is closed
                print("INFO: WebSocket connection closed, exiting loop")
                break

            try:
                data = await websocket.receive_text()
            except (WebSocketDisconnect, RuntimeError) as e:
                print(f"INFO: WebSocket disconnected during receive: {e}")
                break
            except Exception as e:
                print(f"ERROR: Unexpected error receiving WebSocket data: {e}")
                break

            try:
                parsed_data = json.loads(data)
                if isinstance(parsed_data, dict):
                    message = parsed_data.get("message", data) or ""
                    model = parsed_data.get("model", settings.OLLAMA_MODEL)
                    session_id = parsed_data.get("session_id", None)
                    is_private = parsed_data.get(
                        "isPrivate", True
                    )  # Default to private
                    files = parsed_data.get(
                        "files", None
                    )  # Document and image files for analysis

                    # Handle stop request
                    if parsed_data.get("type") == "stop":
                        print("INFO: Received stop request from client")
                        # Set the stop event - now guaranteed to exist
                        stop_analysis_event.set()
                        continue
                    # Handle image_based_pdf_choice from frontend
                    if parsed_data.get("type") == "image_based_pdf_choice":
                        # User has chosen OCR or vision for a scanned PDF
                        # Ensure all arguments are strings
                        choice = str(parsed_data.get("choice") or "")
                        file_path = str(parsed_data.get("file_path") or "")
                        filename = str(parsed_data.get("filename") or "")
                        prompt = str(parsed_data.get("prompt") or "")
                        model = str(parsed_data.get("model") or "")
                        session_id = parsed_data.get("session_id", None)
                        is_private = parsed_data.get("isPrivate", True)
                        file_handler = WebSocketFileHandler(websocket)
                        await file_handler.handle_image_based_pdf_choice(
                            choice=choice,
                            file_path=file_path,
                            filename=filename,
                            prompt=prompt,
                            model=model,
                            session_id=session_id,
                            is_private=is_private,
                        )
                        continue
                    
                    # Handle document creation requests
                    if parsed_data.get("type") == "create_document":
                        prompt = str(parsed_data.get("prompt") or "")
                        format_type = str(parsed_data.get("format_type") or "docx")
                        model = str(parsed_data.get("model") or settings.OLLAMA_MODEL)
                        session_id = parsed_data.get("session_id", None)
                        is_private = parsed_data.get("isPrivate", True)
                        base_content = parsed_data.get("base_content", None)
                        
                        file_handler = WebSocketFileHandler(websocket)
                        try:
                            await file_handler.handle_document_creation(
                                prompt=prompt,
                                format_type=format_type,
                                model=model,
                                session_id=session_id,
                                is_private=is_private,
                                base_content=base_content,
                                stop_event=stop_analysis_event,
                            )
                        except Exception as e:
                            print(f"Document creation error: {e}")
                        continue
                    
                    # Handle document modification requests
                    if parsed_data.get("type") == "modify_document":
                        import base64
                        file_data = parsed_data.get("file", {})
                        filename = file_data.get("filename", "document.txt")
                        
                        # Handle base64 encoded content
                        if "content" in file_data:
                            try:
                                file_content = base64.b64decode(file_data["content"])
                            except Exception:
                                file_content = file_data["content"].encode() if isinstance(file_data["content"], str) else file_data["content"]
                        else:
                            print("No file content provided for document modification")
                            continue
                            
                        modification_prompt = str(parsed_data.get("modification_prompt") or "")
                        model = str(parsed_data.get("model") or settings.OLLAMA_MODEL)
                        session_id = parsed_data.get("session_id", None)
                        is_private = parsed_data.get("isPrivate", True)
                        
                        file_handler = WebSocketFileHandler(websocket)
                        try:
                            await file_handler.handle_document_modification(
                                file_content=file_content,
                                filename=filename,
                                modification_prompt=modification_prompt,
                                model=model,
                                session_id=session_id,
                                is_private=is_private,
                                stop_event=stop_analysis_event,
                            )
                        except Exception as e:
                            print(f"Document modification error: {e}")
                        continue
                    
                    # Handle image creation requests
                    if parsed_data.get("type") == "create_image":
                        prompt = str(parsed_data.get("prompt") or "")
                        style = str(parsed_data.get("style") or "realistic")
                        size = parsed_data.get("size", None)
                        if size and isinstance(size, list) and len(size) == 2:
                            size = tuple(size)
                        format_type = str(parsed_data.get("format_type") or "png")
                        model = str(parsed_data.get("model") or settings.OLLAMA_MODEL)
                        session_id = parsed_data.get("session_id", None)
                        is_private = parsed_data.get("isPrivate", True)
                        
                        file_handler = WebSocketFileHandler(websocket)
                        try:
                            await file_handler.handle_image_creation(
                                prompt=prompt,
                                style=style,
                                size=size,
                                format_type=format_type,
                                model=model,
                                session_id=session_id,
                                is_private=is_private,
                                stop_event=stop_analysis_event,
                            )
                        except Exception as e:
                            print(f"Image creation error: {e}")
                        continue
                    
                    # Handle image modification requests
                    if parsed_data.get("type") == "modify_image":
                        import base64
                        file_data = parsed_data.get("file", {})
                        filename = file_data.get("filename", "image.png")
                        
                        # Handle base64 encoded content
                        if "content" in file_data:
                            try:
                                file_content = base64.b64decode(file_data["content"])
                            except Exception:
                                file_content = file_data["content"].encode() if isinstance(file_data["content"], str) else file_data["content"]
                        else:
                            print("No file content provided for image modification")
                            continue
                            
                        modification_prompt = str(parsed_data.get("modification_prompt") or "")
                        model = str(parsed_data.get("model") or settings.OLLAMA_MODEL)
                        session_id = parsed_data.get("session_id", None)
                        is_private = parsed_data.get("isPrivate", True)
                        
                        file_handler = WebSocketFileHandler(websocket)
                        try:
                            await file_handler.handle_image_modification(
                                file_content=file_content,
                                filename=filename,
                                modification_prompt=modification_prompt,
                                model=model,
                                session_id=session_id,
                                is_private=is_private,
                                stop_event=stop_analysis_event,
                            )
                        except Exception as e:
                            print(f"Image modification error: {e}")
                        continue
                else:
                    message = data or ""
                    model = settings.OLLAMA_MODEL
                    session_id = None
                    is_private = True
                    files = None
            except json.JSONDecodeError:
                message = data or ""
                model = settings.OLLAMA_MODEL
                session_id = None
                is_private = True
                files = None

            try:
                # Extract user information from the message (for public chats only)
                user_info_result = None
                if not is_private and message.strip():
                    try:
                        user_info_result = (
                            await user_info_extractor.process_and_save_user_info(
                                user_message=message, model=model
                            )
                        )
                        print(
                            f"User info extraction: {user_info_result.get('total_saved', 0)} items saved"
                        )

                        # Send memory update notification if items were saved
                        if user_info_result.get("total_saved", 0) > 0:
                            saved_items = user_info_result.get("saved_entries", [])
                            memory_notification = {
                                "type": "memory_updated",
                                "content": f"Memory updated with {user_info_result.get('total_saved', 0)} new items",
                                "saved_items": saved_items,
                                "total_saved": user_info_result.get("total_saved", 0),
                            }
                            try:
                                await websocket.send_text(
                                    json.dumps(memory_notification)
                                )
                            except (WebSocketDisconnect, RuntimeError):
                                print(
                                    "INFO: WebSocket closed during memory notification"
                                )
                                break

                    except Exception as extraction_error:
                        print(f"User info extraction failed: {extraction_error}")
                        # Continue with chat even if extraction fails

                # Check if web search is needed
                web_search_result = None
                web_search_sources = []
                if settings.web_search_enabled and message.strip():
                    try:
                        # Determine if web search is needed
                        search_decision = (
                            await web_search_service.should_perform_web_search(
                                message=message, context=""
                            )
                        )

                        if search_decision.get("should_search", False):
                            print(
                                f"Web search needed: {search_decision.get('reason', 'Unknown')}"
                            )

                            # Perform web search
                            search_terms = search_decision.get("search_terms", message)
                            search_results = (
                                await web_search_service.perform_web_search(
                                    query=search_terms,
                                    engine=settings.web_search_engine,
                                )
                            )
                            web_search_result = (
                                web_search_service.format_search_results(search_results)
                            )
                            web_search_sources = (
                                web_search_service.extract_sources_from_results(
                                    search_results
                                )
                            )

                            # Send web search notification with sources
                            try:
                                await websocket.send_text(
                                    json.dumps(
                                        {
                                            "type": "web_search",
                                            "content": f"Performing web search for: {search_terms}",
                                            "search_terms": search_terms,
                                            "confidence": search_decision.get(
                                                "confidence", "low"
                                            ),
                                            "reason": search_decision.get(
                                                "reason", "Unknown"
                                            ),
                                            "sources": web_search_sources,
                                            "done": False,
                                        }
                                    )
                                )
                            except (WebSocketDisconnect, RuntimeError):
                                print(
                                    "INFO: WebSocket closed during web search notification"
                                )
                                break

                            print(
                                f"Web search completed, found {len(web_search_result.split())} characters of results"
                            )

                            # Send web search completion notification
                            try:
                                await websocket.send_text(
                                    json.dumps(
                                        {
                                            "type": "web_search",
                                            "content": f"Web search completed for: {search_terms}",
                                            "search_terms": search_terms,
                                            "sources": web_search_sources,
                                            "done": True,
                                        }
                                    )
                                )
                            except (WebSocketDisconnect, RuntimeError):
                                print(
                                    "INFO: WebSocket closed during web search completion notification"
                                )
                                break
                        else:
                            print(
                                f"No web search needed: {search_decision.get('reason', 'Unknown')}"
                            )

                    except Exception as search_error:
                        print(f"Web search failed: {search_error}")
                        # Continue with chat even if web search fails

                # Handle file analysis if files are provided
                if files and isinstance(files, list) and len(files) > 0:
                    # Reset the stop event for this analysis (clear any previous state)
                    stop_analysis_event.clear()

                    # Use the new WebSocket file handler
                    file_handler = WebSocketFileHandler(websocket)
                    try:
                        await file_handler.handle_file_analysis(
                            files=files,
                            message=message,
                            model=model,
                            session_id=session_id,
                            is_private=is_private,
                            stop_event=stop_analysis_event,
                        )
                    except (WebSocketDisconnect, RuntimeError) as e:
                        print(f"INFO: WebSocket closed during file analysis: {e}")
                        break
                    except Exception as e:
                        if "stopped by user request" in str(e):
                            print("INFO: File analysis stopped by user request")
                            try:
                                await websocket.send_text(
                                    json.dumps(
                                        {
                                            "type": "error",
                                            "content": "Analysis stopped by user request",
                                            "done": True,
                                        }
                                    )
                                )
                            except (WebSocketDisconnect, RuntimeError):
                                print("INFO: WebSocket closed during stop notification")
                                break
                        else:
                            print(f"INFO: File analysis error: {e}")
                            try:
                                await websocket.send_text(
                                    json.dumps(
                                        {
                                            "type": "error",
                                            "content": f"Analysis failed: {str(e)}",
                                            "done": True,
                                        }
                                    )
                                )
                            except (WebSocketDisconnect, RuntimeError):
                                print(
                                    "INFO: WebSocket closed during error notification"
                                )
                                break
                    continue  # Skip regular chat processing for file analysis

                # Regular chat processing (existing code)
                # Create a session if none provided
                if not session_id:
                    # Create a safe title from the message or use a default
                    safe_title: str = "New Chat"
                    if message:
                        if len(message) > 50:
                            safe_title = message[:50] + "..."
                        else:
                            safe_title = message

                    session_id = database_service.create_chat_session(
                        title=safe_title, model=model, is_private=is_private
                    )

                # Save user message to session (with files if provided)
                user_message_id = database_service.add_message(
                    chat_id=session_id,
                    user_id="user",
                    message=message,
                    model=model,
                    files=files,  # Include files if provided
                )

                # Build context based on privacy setting
                if is_private:
                    # Private chat: context from this session only (isolated)
                    context = context_service.build_private_chat_context(
                        session_id, message
                    )
                else:
                    # Public chat: full context with summaries and memories
                    context = context_service.build_public_chat_context(
                        session_id, message
                    )

                # Add web search results to context if available
                if web_search_result:
                    # Add system prompt to instruct the model to summarize web search results
                    web_search_prompt = f"""Answer using these search results:

{web_search_result}

Q: {message}
A:"""

                    context = web_search_prompt
                    print(
                        "Web search results added to context with summarization prompt"
                    )

                # Stream response from Ollama with context
                # Use longer timeout for larger models
                model_timeout = settings.timeout
                if "llama3" in model.lower() or "llama" in model.lower():
                    model_timeout = 600  # 10 minutes for Llama models
                elif "phi3" in model.lower():
                    model_timeout = 300  # 5 minutes for Phi models
                elif "tiny" in model.lower():
                    model_timeout = 120  # 2 minutes for tiny models

                full_response = ""
                try:
                    async for chunk in ollama_service.query_ollama_stream(
                        context, model_timeout, model
                    ):
                        full_response += chunk
                        try:
                            await websocket.send_text(
                                json.dumps(
                                    {"type": "chunk", "content": chunk, "done": False}
                                )
                            )
                        except (WebSocketDisconnect, RuntimeError):
                            print("INFO: WebSocket closed during streaming")
                            break

                    try:
                        await websocket.send_text(
                            json.dumps({"type": "done", "content": "", "done": True})
                        )
                    except (WebSocketDisconnect, RuntimeError):
                        print("INFO: WebSocket closed during done message")
                        break

                except (WebSocketDisconnect, RuntimeError):
                    print("INFO: WebSocket closed during Ollama streaming")
                    break

                # Save assistant message to session
                assistant_message_id = database_service.add_message(
                    chat_id=session_id,
                    user_id="assistant",
                    message=full_response,
                    model=model,
                    web_search_sources=(
                        web_search_sources if web_search_sources else None
                    ),
                )

                # Generate and store conversation summary (for both private and public chats)
                try:
                    summary_data = (
                        await summarization_service.summarize_conversation_exchange(
                            user_message=message,
                            assistant_message=full_response,
                            model=model,
                        )
                    )

                    # Store the summary in database
                    summary_id = database_service.add_conversation_summary(
                        chat_id=session_id,
                        user_message_id=user_message_id,
                        assistant_message_id=assistant_message_id,
                        summary_data=summary_data,
                        confidence_level=summary_data.get("confidence_level", "low"),
                    )

                    # Send summary to client if confidence is high/medium
                    if summary_data.get("confidence_level") in ["high", "medium"]:
                        try:
                            await websocket.send_text(
                                json.dumps(
                                    {
                                        "type": "summary",
                                        "content": summary_data,
                                        "summary_id": summary_id,
                                        "done": True,
                                    }
                                )
                            )
                        except (WebSocketDisconnect, RuntimeError):
                            print("INFO: WebSocket closed during summary send")
                            break

                except Exception as summary_error:
                    # Log summary error but don't fail the chat
                    print(f"Summary generation failed: {summary_error}")

            except Exception as e:
                error_message = f"Error: {str(e)}"
                try:
                    await websocket.send_text(
                        json.dumps(
                            {"type": "error", "content": error_message, "done": True}
                        )
                    )
                except (WebSocketDisconnect, RuntimeError):
                    # Connection is closed, can't send error message
                    print("INFO: WebSocket closed during error send")
                    break
                print(f"WebSocket error: {e}")
    except WebSocketDisconnect:
        print("INFO: WebSocket client disconnected")
    except Exception as e:
        print(f"ERROR: Unexpected WebSocket error: {e}")
    finally:
        print("INFO: WebSocket connection closed")


@router.get("/chat-history")
async def get_chat_history(limit: int, offset: int):
    """Get chat history with pagination"""
    # Get recent context from all sessions
    context = database_service.get_recent_context(limit=limit)
    return {
        "messages": context,
        "total": len(context),
        "has_more": offset + limit < len(context),
    }


@router.get("/chat-sessions")
async def get_chat_sessions():
    """Get all chat sessions"""
    sessions = database_service.get_chat_sessions()
    return {"sessions": sessions}


@router.post("/chat-sessions")
async def create_chat_session(request: ChatSessionRequest):
    """Create a new chat session"""
    try:
        title = request.title or "New Chat"
        session_id = database_service.create_chat_session(
            title=title, model=settings.OLLAMA_MODEL, is_private=request.isPrivate
        )
        session = database_service.get_chat_session(session_id)
        return {
            "status": "success",
            "session": session,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create chat session: {str(e)}"
        )


@router.get("/chat-sessions/{session_id}")
async def get_chat_session(session_id: str):
    """Get a specific chat session by ID"""
    session = database_service.get_chat_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session


@router.put("/chat-sessions/{session_id}/title")
async def update_chat_session_title_endpoint(
    session_id: str, request: ChatSessionUpdateRequest
):
    """Update the title of a chat session"""
    success = database_service.update_chat_session(session_id, title=request.title)
    if not success:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {"status": "success", "message": "Title updated successfully"}


@router.delete("/chat-sessions/{session_id}")
async def delete_chat_session_endpoint(session_id: str):
    """Delete a chat session"""
    success = database_service.delete_chat_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {"status": "success", "message": "Chat session deleted successfully"}


@router.post("/chat-sessions/{session_id}/messages")
async def add_message_to_chat_session_endpoint(
    session_id: str, request: ChatMessageRequest
):
    """Add a message to a chat session"""
    # Convert FileInfo objects to dict for database storage
    files_data = None
    if request.files:
        files_data = [file.dict() for file in request.files]

    message_id = database_service.add_message(
        chat_id=session_id,
        user_id=request.user_id,
        message=request.message,
        model=request.model,
        files=files_data,
    )
    return {"status": "success", "message_id": message_id}


@router.get("/chat-sessions/{session_id}/messages")
async def get_chat_session_messages(session_id: str, limit: int, offset: int):
    """Get messages from a specific chat session with pagination"""
    messages = database_service.get_messages(session_id, limit=limit, offset=offset)
    total = database_service.get_message_count(session_id)
    return {
        "messages": messages,
        "total": total,
        "has_more": offset + limit < total,
    }


@router.post("/chat-sessions/{session_id}/send-message")
async def send_message_to_chat_session(session_id: str, request: ChatMessageRequest):
    """Send a message to a chat session and get AI response"""
    try:
        # Get session info to check privacy setting
        session = database_service.get_chat_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")

        is_private = session.get("is_private", True)

        # Extract user information from the message (for public chats only)
        user_info_result = None
        if not is_private and request.message.strip():
            try:
                user_info_result = await user_info_extractor.process_and_save_user_info(
                    user_message=request.message, model=request.model
                )
                print(
                    f"User info extraction: {user_info_result.get('total_saved', 0)} items saved"
                )
            except Exception as extraction_error:
                print(f"User info extraction failed: {extraction_error}")
                # Continue with chat even if extraction fails

        # Check if web search is needed
        web_search_result = None
        web_search_sources = []
        if settings.web_search_enabled and request.message.strip():
            try:
                # Determine if web search is needed
                search_decision = await web_search_service.should_perform_web_search(
                    message=request.message, context=""
                )

                if search_decision.get("should_search", False):
                    print(
                        f"Web search needed: {search_decision.get('reason', 'Unknown')}"
                    )

                    # Perform web search
                    search_terms = search_decision.get("search_terms", request.message)
                    search_results = await web_search_service.perform_web_search(
                        query=search_terms, engine=settings.web_search_engine
                    )
                    web_search_result = web_search_service.format_search_results(
                        search_results
                    )
                    web_search_sources = (
                        web_search_service.extract_sources_from_results(search_results)
                    )

                    print(
                        f"Web search completed, found {len(web_search_result.split())} characters of results"
                    )
                else:
                    print(
                        f"No web search needed: {search_decision.get('reason', 'Unknown')}"
                    )

            except Exception as search_error:
                print(f"Web search failed: {search_error}")
                # Continue with chat even if web search fails

        # Convert FileInfo objects to dict for database storage
        files_data = None
        if request.files:
            files_data = [file.dict() for file in request.files]

        # Add user message
        user_message_id = database_service.add_message(
            chat_id=session_id,
            user_id=request.user_id,
            message=request.message,
            model=request.model,
            files=files_data,
        )

        # Build context based on privacy setting
        if is_private:
            # Private chat: context from this session only (isolated)
            context = context_service.build_private_chat_context(
                session_id, request.message
            )
        else:
            # Public chat: full context with summaries and memories
            context = context_service.build_public_chat_context(
                session_id, request.message
            )

        # Add web search results to context if available
        if web_search_result:
            # Add system prompt to instruct the model to summarize web search results
            web_search_prompt = f"""Answer using these search results:

{web_search_result}

Q: {request.message}
A:"""

            context = web_search_prompt
            print("Web search results added to context with summarization prompt")

        # Get AI response with context
        # Use longer timeout for larger models
        model_timeout = settings.timeout
        if "llama3" in request.model.lower() or "llama" in request.model.lower():
            model_timeout = 600  # 10 minutes for Llama models
        elif "phi3" in request.model.lower():
            model_timeout = 300  # 5 minutes for Phi models
        elif "tiny" in request.model.lower():
            model_timeout = 120  # 2 minutes for tiny models

        ai_response = await ollama_service.query_ollama(
            context, model_timeout, request.model
        )

        # Add AI response
        assistant_message_id = database_service.add_message(
            chat_id=session_id,
            user_id="assistant",
            message=ai_response,
            model=request.model,
            web_search_sources=web_search_sources if web_search_sources else None,
        )

        # Generate and store conversation summary (for both private and public chats)
        summary_data = None
        summary_id = None
        try:
            summary_data = await summarization_service.summarize_conversation_exchange(
                user_message=request.message,
                assistant_message=ai_response,
                model=request.model,
            )

            summary_id = database_service.add_conversation_summary(
                chat_id=session_id,
                user_message_id=user_message_id,
                assistant_message_id=assistant_message_id,
                summary_data=summary_data,
                confidence_level=summary_data.get("confidence_level", "low"),
            )

        except Exception as summary_error:
            print(f"Summary generation failed: {summary_error}")

        return {
            "status": "success",
            "user_message_id": user_message_id,
            "ai_message_id": assistant_message_id,
            "ai_response": ai_response,
            "summary": summary_data,
            "summary_id": summary_id,
            "is_private": is_private,
            "user_info_extraction": user_info_result,
            "web_search": (
                {
                    "performed": web_search_result is not None,
                    "search_terms": (
                        search_decision.get("search_terms")
                        if "search_decision" in locals()
                        else None
                    ),
                    "confidence": (
                        search_decision.get("confidence")
                        if "search_decision" in locals()
                        else None
                    ),
                    "reason": (
                        search_decision.get("reason")
                        if "search_decision" in locals()
                        else None
                    ),
                    "sources": web_search_sources,
                }
                if "search_decision" in locals()
                else {"performed": False, "sources": []}
            ),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")


# Summary-related endpoints
@router.post("/summarize-conversation", response_model=SummaryResponse)
async def summarize_conversation_endpoint(request: SummaryRequest):
    """Summarize a conversation exchange"""
    try:
        summary_data = await summarization_service.summarize_conversation_exchange(
            user_message=request.user_message,
            assistant_message=request.assistant_message,
            model=request.model,
        )

        # Convert dict to ConversationSummary model
        conversation_summary = ConversationSummary(**summary_data)

        return SummaryResponse(
            status="success",
            summary=conversation_summary,
            summary_id=None,  # Not stored in this endpoint
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate summary: {str(e)}"
        )


@router.post(
    "/chat-sessions/{session_id}/summarize", response_model=SessionSummaryResponse
)
async def summarize_session_endpoint(session_id: str, request: SessionSummaryRequest):
    """Summarize an entire chat session"""
    try:
        # Get all messages from the session
        messages = database_service.get_messages(session_id, limit=1000, offset=0)

        if len(messages) < 2:
            raise HTTPException(
                status_code=400,
                detail="Session must have at least 2 messages to summarize",
            )

        # Generate session summary
        summary_data = await summarization_service.summarize_session_messages(
            messages=messages, model=request.model
        )

        # Store session summary
        summary_id = database_service.add_session_summary(
            chat_id=session_id,
            summary_data=summary_data,
            message_count=len(messages),
            confidence_level=summary_data.get("confidence_level", "low"),
            session_quality=summary_data.get("session_quality"),
        )

        # Convert dict to SessionSummary model
        session_summary = SessionSummary(**summary_data)

        return SessionSummaryResponse(
            status="success", summary=session_summary, summary_id=summary_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate session summary: {str(e)}"
        )


@router.get("/chat-sessions/{session_id}/summaries")
async def get_session_summaries(session_id: str, limit: int = 50, offset: int = 0):
    """Get conversation summaries for a chat session"""
    try:
        summaries = database_service.get_conversation_summaries(
            chat_id=session_id, limit=limit, offset=offset
        )
        return {
            "status": "success",
            "summaries": summaries,
            "total": len(summaries),
            "has_more": offset + limit < len(summaries),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get summaries: {str(e)}"
        )


@router.get("/chat-sessions/{session_id}/summary")
async def get_session_summary(session_id: str):
    """Get the latest session summary"""
    try:
        summary = database_service.get_session_summary(chat_id=session_id)
        if not summary:
            raise HTTPException(status_code=404, detail="No session summary found")

        return {
            "status": "success",
            "summary": summary,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get session summary: {str(e)}"
        )


@router.get(
    "/chat-sessions/{session_id}/insights", response_model=SummaryInsightsResponse
)
async def get_session_insights(session_id: str, limit: int = 10):
    """Get key insights from session summaries"""
    try:
        insights_data = database_service.get_summary_insights(
            chat_id=session_id, limit=limit
        )
        # Convert list of dicts to list of strings
        insights = [str(insight) for insight in insights_data]
        return SummaryInsightsResponse(
            status="success", insights=insights, total_count=len(insights)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get insights: {str(e)}")


@router.get("/summaries/high-confidence")
async def get_high_confidence_summaries(limit: int = 20):
    """Get high confidence summaries across all sessions"""
    try:
        summaries = database_service.get_high_confidence_summaries(limit=limit)
        return {
            "status": "success",
            "summaries": summaries,
            "total": len(summaries),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get high confidence summaries: {str(e)}"
        )


@router.post("/analyze-documents", response_model=DocumentAnalysisResponse)
async def analyze_documents_endpoint(request: DocumentAnalysisRequest):
    """Analyze documents with a given prompt"""
    try:
        # Validate files
        if not request.files or len(request.files) == 0:
            raise HTTPException(status_code=400, detail="No files provided")

        for file_data in request.files:
            if (
                not isinstance(file_data, dict)
                or "filename" not in file_data
                or "content" not in file_data
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid file format. Each file must have 'filename' and 'content' fields.",
                )

            # Check if file type is supported
            if not document_service.is_supported_file(str(file_data["filename"])):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type: {file_data['filename']}",
                )

        # Perform document analysis
        analysis_result = await document_service.analyze_documents(
            files=request.files, prompt=request.prompt, model=request.model
        )

        return DocumentAnalysisResponse(
            status=analysis_result["status"],
            analysis=analysis_result["analysis"],
            documents_processed=analysis_result["documents_processed"],
            method=analysis_result["method"],
            total_text_length=analysis_result.get("total_text_length"),
            chunks_analyzed=analysis_result.get("chunks_analyzed"),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Document analysis failed: {str(e)}"
        )


@router.post("/analyze-images", response_model=ImageAnalysisResponse)
async def analyze_images_endpoint(request: ImageAnalysisRequest):
    """Analyze images with a given prompt"""
    try:
        # Validate files
        if not request.files or len(request.files) == 0:
            raise HTTPException(status_code=400, detail="No files provided")

        for file_data in request.files:
            if (
                not isinstance(file_data, dict)
                or "filename" not in file_data
                or "content" not in file_data
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid file format. Each file must have 'filename' and 'content' fields.",
                )

            # Check if file type is supported
            if not image_service.is_supported_image(str(file_data["filename"])):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported image type: {file_data['filename']}",
                )

        # Perform image analysis
        analysis_result = await image_service.analyze_images(
            files=request.files, prompt=request.prompt, model=request.model
        )

        return ImageAnalysisResponse(
            status=analysis_result["status"],
            analysis=analysis_result["analysis"],
            images_processed=analysis_result["images_processed"],
            method=analysis_result["method"],
            model_used=analysis_result["model_used"],
            analysis_strategy=analysis_result["analysis_strategy"],
            image_details=analysis_result.get("image_details"),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {str(e)}")


@router.get("/supported-file-types")
async def get_supported_file_types():
    """Get list of supported file types for document and image analysis"""
    return {
        "status": "success",
        "document_types": list(document_service.SUPPORTED_EXTENSIONS.keys()),
        "image_types": list(image_service.SUPPORTED_EXTENSIONS.keys()),
        "document_mime_types": document_service.SUPPORTED_EXTENSIONS,
        "image_mime_types": image_service.SUPPORTED_EXTENSIONS,
    }


@router.post("/web-search")
async def perform_web_search(query: str, engine: str = "duckduckgo"):
    """Perform a web search manually"""
    try:
        if not settings.web_search_enabled:
            raise HTTPException(status_code=400, detail="Web search is disabled")

        # Perform the search
        search_results = await web_search_service.perform_web_search(query, engine)

        if search_results.get("status") == "success":
            return {
                "status": "success",
                "query": query,
                "engine": engine,
                "results": search_results.get("results", []),
                "total_results": search_results.get("total_results", 0),
                "formatted_results": web_search_service.format_search_results(
                    search_results
                ),
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Web search failed: {search_results.get('error', 'Unknown error')}",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Web search failed: {str(e)}")


@router.post("/web-search/check")
async def check_web_search_needed(message: str, context: str = ""):
    """Check if a web search is needed for a given message"""
    try:
        if not settings.web_search_enabled:
            return {
                "status": "success",
                "should_search": False,
                "reason": "Web search is disabled",
                "confidence": "low",
            }

        # Determine if web search is needed
        search_decision = await web_search_service.should_perform_web_search(
            message, context
        )

        return {
            "status": "success",
            "should_search": search_decision.get("should_search", False),
            "confidence": search_decision.get("confidence", "low"),
            "reason": search_decision.get("reason", "Unknown"),
            "search_terms": search_decision.get("search_terms"),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to check web search need: {str(e)}"
        )


# Document and Image Creation/Modification Endpoints

@router.post("/create-document", response_model=DocumentCreationResponse)
async def create_document_endpoint(request: DocumentCreationRequest):
    """Create a new document from a text prompt"""
    try:
        result = await document_creation_service.create_document_from_prompt(
            prompt=request.prompt,
            format_type=request.format_type,
            model=request.model,
            base_content=request.base_content
        )
        
        return DocumentCreationResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create document: {str(e)}"
        )


@router.post("/modify-document", response_model=DocumentModificationResponse)
async def modify_document_endpoint(request: DocumentModificationRequest):
    """Modify an existing document based on a prompt"""
    try:
        # Extract file content from request
        file_data = request.file
        filename = file_data.get("filename", "document.txt")
        
        # Handle base64 encoded content
        if "content" in file_data:
            import base64
            try:
                file_content = base64.b64decode(file_data["content"])
            except Exception:
                # If not base64, treat as raw bytes
                file_content = file_data["content"].encode() if isinstance(file_data["content"], str) else file_data["content"]
        else:
            raise HTTPException(status_code=400, detail="File content is required")
        
        result = await document_creation_service.modify_document(
            file_content=file_content,
            filename=filename,
            modification_prompt=request.modification_prompt,
            model=request.model
        )
        
        return DocumentModificationResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to modify document: {str(e)}"
        )


@router.post("/create-image", response_model=ImageCreationResponse)
async def create_image_endpoint(request: ImageCreationRequest):
    """Create a new image from a text prompt"""
    try:
        # Convert size list to tuple if provided
        size = tuple(request.size) if request.size else None
        
        result = await image_creation_service.create_image_from_prompt(
            prompt=request.prompt,
            style=request.style,
            size=size,
            format_type=request.format_type,
            model=request.model
        )
        
        # Convert size tuple back to list for response
        if result.get("size"):
            result["size"] = list(result["size"])
        
        return ImageCreationResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create image: {str(e)}"
        )


@router.post("/modify-image", response_model=ImageModificationResponse)
async def modify_image_endpoint(request: ImageModificationRequest):
    """Modify an existing image based on a prompt"""
    try:
        # Extract file content from request
        file_data = request.file
        filename = file_data.get("filename", "image.png")
        
        # Handle base64 encoded content
        if "content" in file_data:
            import base64
            try:
                file_content = base64.b64decode(file_data["content"])
            except Exception:
                # If not base64, treat as raw bytes
                file_content = file_data["content"].encode() if isinstance(file_data["content"], str) else file_data["content"]
        else:
            raise HTTPException(status_code=400, detail="File content is required")
        
        result = await image_creation_service.modify_image(
            file_content=file_content,
            filename=filename,
            modification_prompt=request.modification_prompt,
            model=request.model
        )
        
        return ImageModificationResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to modify image: {str(e)}"
        )


@router.get("/creation-formats")
async def get_creation_formats():
    """Get supported file formats for creation and modification"""
    return {
        "document_formats": {
            "creation": list(document_creation_service.SUPPORTED_CREATION_FORMATS.keys()),
            "modification": list(document_creation_service.SUPPORTED_CREATION_FORMATS.keys())
        },
        "image_formats": {
            "creation": list(image_creation_service.SUPPORTED_OUTPUT_FORMATS.keys()),
            "modification": list(image_creation_service.SUPPORTED_OUTPUT_FORMATS.keys())
        }
    }
