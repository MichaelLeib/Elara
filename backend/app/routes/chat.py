import json
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    ChatSessionRequest,
    ChatSessionUpdateRequest,
    ChatMessageRequest,
)
from app.services.ollama_service import ollama_service
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
                else:
                    message = data or ""
                    model = settings.OLLAMA_MODEL
                    session_id = None
            except json.JSONDecodeError:
                message = data or ""
                model = settings.OLLAMA_MODEL
                session_id = None

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
                        title=safe_title, model=model
                    )

                # Save user message to session
                database_service.add_message(
                    chat_id=session_id,
                    user_id="user",
                    message=message,
                    model=model,
                )

                # Stream response from Ollama
                full_response = ""
                async for chunk in ollama_service.query_ollama_stream(
                    message, settings.timeout, model
                ):
                    full_response += chunk
                    await websocket.send_text(
                        json.dumps({"type": "chunk", "content": chunk, "done": False})
                    )

                await websocket.send_text(
                    json.dumps({"type": "done", "content": "", "done": True})
                )

                # Save assistant message to session
                database_service.add_message(
                    chat_id=session_id,
                    user_id="assistant",
                    message=full_response,
                    model=model,
                )
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
        session_id = database_service.create_chat_session(
            request.title, settings.OLLAMA_MODEL
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
        # Add user message
        user_message_id = database_service.add_message(
            chat_id=session_id,
            user_id=request.user_id,
            message=request.message,
            model=request.model,
        )
        # Get AI response
        ai_response = await ollama_service.query_ollama(
            request.message, 30.0, request.model
        )
        # Add AI response
        ai_message_id = database_service.add_message(
            chat_id=session_id,
            user_id="assistant",
            message=ai_response,
            model=request.model,
        )
        return {
            "status": "success",
            "user_message_id": user_message_id,
            "ai_message_id": ai_message_id,
            "ai_response": ai_response,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")
