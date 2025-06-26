import json
from datetime import datetime
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
)
from app.services.ollama_service import ollama_service
from app.services.summarization_service import summarization_service
from app.services.context_service import context_service
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
                else:
                    message = data or ""
                    model = settings.OLLAMA_MODEL
                    session_id = None
                    is_private = True
            except json.JSONDecodeError:
                message = data or ""
                model = settings.OLLAMA_MODEL
                session_id = None
                is_private = True

            try:
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
    total = len(messages)
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
