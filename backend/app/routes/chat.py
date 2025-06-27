import json
import asyncio
from typing import Optional, Union
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
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
)
from app.services.ollama_service import ollama_service
from app.services.summarization_service import summarization_service
from app.services.context_service import context_service
from app.services.document_service import document_service
from app.config.settings import settings
from app.services.database_service import database_service

router = APIRouter(prefix="/api", tags=["chat"])


@router.websocket("/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
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
                    )  # Document files for analysis
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
                # Handle document analysis if files are provided
                if files and isinstance(files, list) and len(files) > 0:
                    await websocket.send_text(
                        json.dumps(
                            {
                                "type": "status",
                                "content": "Starting document analysis...",
                                "progress": 5,
                                "done": False,
                            }
                        )
                    )

                    try:
                        # Validate files
                        await websocket.send_text(
                            json.dumps(
                                {
                                    "type": "status",
                                    "content": "Validating uploaded files...",
                                    "progress": 10,
                                    "done": False,
                                }
                            )
                        )

                        for file_data in files:
                            if (
                                not isinstance(file_data, dict)
                                or "filename" not in file_data
                                or "content" not in file_data
                            ):
                                raise Exception(
                                    "Invalid file format. Each file must have 'filename' and 'content' fields."
                                )

                            # Check if file type is supported
                            if not document_service.is_supported_file(
                                str(file_data["filename"])
                            ):
                                raise Exception(
                                    f"Unsupported file type: {file_data['filename']}"
                                )

                        await websocket.send_text(
                            json.dumps(
                                {
                                    "type": "status",
                                    "content": "Files validated successfully",
                                    "progress": 15,
                                    "done": False,
                                }
                            )
                        )

                        # Perform document analysis with streaming
                        await websocket.send_text(
                            json.dumps(
                                {
                                    "type": "status",
                                    "content": "Extracting text from documents...",
                                    "progress": 20,
                                    "done": False,
                                }
                            )
                        )

                        # Check if we should chunk the document
                        should_chunk = document_service.should_chunk_documents(
                            combined_text="",  # We'll get this from the analysis
                            model_name=model,
                        )

                        if should_chunk:
                            await websocket.send_text(
                                json.dumps(
                                    {
                                        "type": "status",
                                        "content": "Document is large, preparing chunked analysis...",
                                        "progress": 25,
                                        "done": False,
                                    }
                                )
                            )
                        else:
                            await websocket.send_text(
                                json.dumps(
                                    {
                                        "type": "status",
                                        "content": "Document size is manageable, using direct analysis...",
                                        "progress": 25,
                                        "done": False,
                                    }
                                )
                            )

                        # Perform document analysis
                        await websocket.send_text(
                            json.dumps(
                                {
                                    "type": "status",
                                    "content": "Analyzing document content with AI model...",
                                    "progress": 30,
                                    "done": False,
                                }
                            )
                        )

                        # Create progress callback function
                        async def progress_callback(
                            message: str, progress: Union[int, float]
                        ):
                            await websocket.send_text(
                                json.dumps(
                                    {
                                        "type": "status",
                                        "content": message,
                                        "progress": int(progress),
                                        "done": False,
                                    }
                                )
                            )

                        # Create a wrapper that handles the async callback properly
                        def sync_progress_callback(
                            message: str, progress: Union[int, float]
                        ):
                            # Schedule the async callback to run
                            asyncio.create_task(progress_callback(message, progress))

                        analysis_result = await document_service.analyze_documents(
                            files=files,
                            prompt=message,
                            model=model,
                            progress_callback=sync_progress_callback,
                        )

                        await websocket.send_text(
                            json.dumps(
                                {
                                    "type": "status",
                                    "content": "Analysis complete, preparing results...",
                                    "progress": 70,
                                    "done": False,
                                }
                            )
                        )

                        # Stream the analysis result in chunks
                        analysis_text = analysis_result["analysis"]
                        chunk_size = 100

                        await websocket.send_text(
                            json.dumps(
                                {
                                    "type": "status",
                                    "content": "Streaming analysis results...",
                                    "progress": 75,
                                    "done": False,
                                }
                            )
                        )

                        for i in range(0, len(analysis_text), chunk_size):
                            chunk = analysis_text[i : i + chunk_size]
                            progress = min(
                                75 + (i / len(analysis_text)) * 20, 95
                            )  # Progress from 75% to 95%

                            await websocket.send_text(
                                json.dumps(
                                    {
                                        "type": "document_analysis_chunk",
                                        "content": chunk,
                                        "progress": int(progress),
                                        "done": False,
                                    }
                                )
                            )
                            await asyncio.sleep(
                                0.05
                            )  # Small delay for smooth streaming

                        # Send final completion message
                        await websocket.send_text(
                            json.dumps(
                                {
                                    "type": "document_analysis",
                                    "content": analysis_result["analysis"],
                                    "metadata": {
                                        "documents_processed": analysis_result[
                                            "documents_processed"
                                        ],
                                        "method": analysis_result["method"],
                                        "total_text_length": analysis_result.get(
                                            "total_text_length"
                                        ),
                                        "chunks_analyzed": analysis_result.get(
                                            "chunks_analyzed"
                                        ),
                                    },
                                    "progress": 100,
                                    "done": True,
                                }
                            )
                        )

                        # Create a session to store the analysis if no session_id provided
                        if not session_id:
                            safe_title = f"Document Analysis: {message[:50]}{'...' if len(message) > 50 else ''}"
                            session_id = database_service.create_chat_session(
                                title=safe_title, model=model, is_private=is_private
                            )

                        # Save user message (the prompt) to session
                        user_message_id = database_service.add_message(
                            chat_id=session_id,
                            user_id="user",
                            message=f"Document Analysis Request: {message}",
                            model=model,
                        )

                        # Save assistant response to session
                        assistant_message_id = database_service.add_message(
                            chat_id=session_id,
                            user_id="assistant",
                            message=analysis_result["analysis"],
                            model=model,
                        )

                        # Generate and store conversation summary asynchronously in the background
                        # This won't block the WebSocket response
                        async def generate_summary_background():
                            try:
                                print(
                                    f"[Background] Starting summary generation for session {session_id}"
                                )
                                summary_data = await summarization_service.summarize_conversation_exchange(
                                    user_message=f"Document Analysis Request: {message}",
                                    assistant_message=analysis_result["analysis"],
                                    model=model,
                                    timeout=60.0,  # Explicitly use longer timeout for document analysis
                                )

                                if session_id:  # Ensure session_id is not None
                                    summary_id = (
                                        database_service.add_conversation_summary(
                                            chat_id=session_id,
                                            user_message_id=user_message_id,
                                            assistant_message_id=assistant_message_id,
                                            summary_data=summary_data,
                                            confidence_level=summary_data.get(
                                                "confidence_level", "low"
                                            ),
                                        )
                                    )

                                    print(
                                        f"[Background] Document analysis summary generated and stored (ID: {summary_id})"
                                    )
                                else:
                                    print(
                                        "[Background] No session_id available, skipping summary storage"
                                    )

                            except Exception as summary_error:
                                print(
                                    f"[Background] Summary generation failed: {summary_error}"
                                )

                        # Start the background task without waiting for it
                        asyncio.create_task(generate_summary_background())

                    except Exception as analysis_error:
                        error_message = (
                            f"Document analysis failed: {str(analysis_error)}"
                        )
                        await websocket.send_text(
                            json.dumps(
                                {
                                    "type": "error",
                                    "content": error_message,
                                    "done": True,
                                }
                            )
                        )
                        print(f"Document analysis error: {analysis_error}")

                    continue  # Skip regular chat processing for document analysis

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

                # Save user message to session
                user_message_id = database_service.add_message(
                    chat_id=session_id,
                    user_id="user",
                    message=message,
                    model=model,
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

                # Stream response from Ollama with context
                full_response = ""
                async for chunk in ollama_service.query_ollama_stream(
                    context, settings.timeout, model
                ):
                    full_response += chunk
                    await websocket.send_text(
                        json.dumps({"type": "chunk", "content": chunk, "done": False})
                    )

                await websocket.send_text(
                    json.dumps({"type": "done", "content": "", "done": True})
                )

                # Save assistant message to session
                assistant_message_id = database_service.add_message(
                    chat_id=session_id,
                    user_id="assistant",
                    message=full_response,
                    model=model,
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

                except Exception as summary_error:
                    # Log summary error but don't fail the chat
                    print(f"Summary generation failed: {summary_error}")

            except Exception as e:
                error_message = f"Error: {str(e)}"
                await websocket.send_text(
                    json.dumps(
                        {"type": "error", "content": error_message, "done": True}
                    )
                )
                print(f"WebSocket error: {e}")
    except WebSocketDisconnect:
        pass


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
    message_id = database_service.add_message(
        chat_id=session_id,
        user_id=request.user_id,
        message=request.message,
        model=request.model,
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

        # Add user message
        user_message_id = database_service.add_message(
            chat_id=session_id,
            user_id=request.user_id,
            message=request.message,
            model=request.model,
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

        # Get AI response with context
        ai_response = await ollama_service.query_ollama(context, 30.0, request.model)

        # Add AI response
        assistant_message_id = database_service.add_message(
            chat_id=session_id,
            user_id="assistant",
            message=ai_response,
            model=request.model,
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


@router.get("/supported-file-types")
async def get_supported_file_types():
    """Get list of supported file types for document analysis"""
    return {
        "status": "success",
        "supported_types": list(document_service.SUPPORTED_EXTENSIONS.keys()),
        "mime_types": document_service.SUPPORTED_EXTENSIONS,
    }
