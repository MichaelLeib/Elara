import json
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from app.models.schemas import (
    ChatRequest, ChatResponse, ChatSessionRequest, ChatSessionUpdateRequest,
    ChatMessageRequest
)
from app.services.ollama_service import ollama_service
from app.config.settings import settings
from storage.fileOperations import (
    create_chat_snippet, get_chat_snippets, create_new_chat_session,
    get_all_chat_sessions, load_chat_session, delete_chat_session,
    update_chat_session_title, add_message_to_chat_session, create_id,
    get_next_chat_index, ChatSnippet
)

router = APIRouter(prefix="/api", tags=["chat"])


@router.websocket("/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive text data
            data = await websocket.receive_text()
            
            # Try to parse as JSON for model selection, fallback to plain text
            try:
                parsed_data = json.loads(data)
                print(parsed_data)
                if isinstance(parsed_data, dict):
                    message = parsed_data.get("message", data)
                    model = parsed_data.get("model", settings.OLLAMA_MODEL)
                    chat_index = parsed_data.get("chat_index", None)
                else:
                    message = data
                    model = settings.OLLAMA_MODEL
                    chat_index = None
            except json.JSONDecodeError:
                # If not JSON, treat as plain message
                message = data
                model = settings.OLLAMA_MODEL
                chat_index = None
            
            try:
                # Save chat history - user message
                create_chat_snippet(message, "user", model)
                
                # If chat_index is provided, also save to chat session
                if chat_index is not None:
                    user_message = ChatSnippet(
                        id=create_id(),
                        user_id="user",
                        message=message,
                        model=model,
                        created_at=datetime.now(),
                        updated_at=datetime.now()
                    )
                    add_message_to_chat_session(chat_index, user_message)
                
                # Stream response from Ollama
                full_response = ""
                async for chunk in ollama_service.query_ollama_stream(message, 10.0, model):
                    full_response += chunk
                    # Send each chunk to the client
                    await websocket.send_text(json.dumps({
                        "type": "chunk",
                        "content": chunk,
                        "done": False
                    }))
                
                # Send completion signal
                await websocket.send_text(json.dumps({
                    "type": "done",
                    "content": "",
                    "done": True
                }))
                
                # Save chat history - assistant response
                create_chat_snippet(full_response, "assistant", model)
                
                # If chat_index is provided, also save AI response to chat session
                if chat_index is not None:
                    ai_message = ChatSnippet(
                        id=create_id(),
                        user_id="assistant",
                        message=full_response,
                        model=model,
                        created_at=datetime.now(),
                        updated_at=datetime.now()
                    )
                    add_message_to_chat_session(chat_index, ai_message)
                
            except Exception as e:
                # Send error message back to client
                error_message = f"Error: {str(e)}"
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "content": error_message,
                    "done": True
                }))
                print(f"WebSocket error: {e}")
                
    except WebSocketDisconnect:
        pass


@router.websocket("/chat-sessions/{chat_index}/ws")
async def chat_session_websocket_endpoint(websocket: WebSocket, chat_index: int):
    """WebSocket endpoint for a specific chat session"""
    await websocket.accept()
    
    # Verify chat session exists
    session = load_chat_session(chat_index)
    if not session:
        await websocket.send_text(json.dumps({
            "type": "error",
            "content": "Chat session not found",
            "done": True
        }))
        return
    
    try:
        while True:
            # Receive text data
            data = await websocket.receive_text()
            
            # Try to parse as JSON for model selection, fallback to plain text
            try:
                parsed_data = json.loads(data)
                print(parsed_data)
                if isinstance(parsed_data, dict):
                    message = parsed_data.get("message", data)
                    model = parsed_data.get("model", settings.OLLAMA_MODEL)
                else:
                    message = data
                    model = settings.OLLAMA_MODEL
            except json.JSONDecodeError:
                # If not JSON, treat as plain message
                message = data
                model = settings.OLLAMA_MODEL
            
            try:
                # Add user message to chat session
                user_message = ChatSnippet(
                    id=create_id(),
                    user_id="user",
                    message=message,
                    model=model,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                add_message_to_chat_session(chat_index, user_message)
                
                # Stream response from Ollama
                full_response = ""
                async for chunk in ollama_service.query_ollama_stream(message, 10.0, model):
                    full_response += chunk
                    # Send each chunk to the client
                    await websocket.send_text(json.dumps({
                        "type": "chunk",
                        "content": chunk,
                        "done": False
                    }))
                
                # Send completion signal
                await websocket.send_text(json.dumps({
                    "type": "done",
                    "content": "",
                    "done": True
                }))
                
                # Add AI response to chat session
                ai_message = ChatSnippet(
                    id=create_id(),
                    user_id="assistant",
                    message=full_response,
                    model=model,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                add_message_to_chat_session(chat_index, ai_message)
                
            except Exception as e:
                # Send error message back to client
                error_message = f"Error: {str(e)}"
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "content": error_message,
                    "done": True
                }))
                print(f"WebSocket error: {e}")
                
    except WebSocketDisconnect:
        pass


@router.get("/chat-history")
async def get_chat_history(limit: int = 50, offset: int = 0):
    """Get chat history with pagination"""
    snippets = get_chat_snippets()
    # Sort by created_at in descending order (newest first)
    sorted_snippets = sorted(snippets, key=lambda x: x.created_at, reverse=True)
    # Apply pagination
    paginated_snippets = sorted_snippets[offset:offset + limit]
    return {
        "messages": paginated_snippets,
        "total": len(sorted_snippets),
        "has_more": offset + limit < len(sorted_snippets)
    }


@router.get("/chat-sessions")
async def get_chat_sessions():
    """Get all chat sessions"""
    return {"sessions": get_all_chat_sessions()}


@router.post("/chat-sessions")
async def create_chat_session(request: ChatSessionRequest):
    """Create a new chat session"""
    try:
        session = create_new_chat_session(request.title)
        # Extract the actual index from the saved file, not from title
        chat_index = get_next_chat_index() - 1  # Since get_next_chat_index returns the next available index
        return {
            "status": "success",
            "session": {
                "id": session.id,
                "title": session.title,
                "index": chat_index,
                "message_count": len(session.messages),
                "created_at": session.created_at,
                "updated_at": session.updated_at
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create chat session: {str(e)}")


@router.get("/chat-sessions/{chat_index}")
async def get_chat_session(chat_index: int):
    """Get a specific chat session by index"""
    session = load_chat_session(chat_index)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session


@router.put("/chat-sessions/{chat_index}/title")
async def update_chat_session_title_endpoint(chat_index: int, request: ChatSessionUpdateRequest):
    """Update the title of a chat session"""
    success = update_chat_session_title(chat_index, request.title)
    if not success:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {"status": "success", "message": "Title updated successfully"}


@router.delete("/chat-sessions/{chat_index}")
async def delete_chat_session_endpoint(chat_index: int):
    """Delete a chat session"""
    success = delete_chat_session(chat_index)
    if not success:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {"status": "success", "message": "Chat session deleted successfully"}


@router.post("/chat-sessions/{chat_index}/messages")
async def add_message_to_chat_session_endpoint(chat_index: int, request: ChatMessageRequest):
    """Add a message to a chat session"""
    message = ChatSnippet(
        id=create_id(),
        user_id=request.user_id,
        message=request.message,
        model=request.model,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    success = add_message_to_chat_session(chat_index, message)
    if not success:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {"status": "success", "message": "Message added successfully"}


@router.get("/chat-sessions/{chat_index}/messages")
async def get_chat_session_messages(chat_index: int, limit: int = 50, offset: int = 0):
    """Get messages from a specific chat session with pagination"""
    session = load_chat_session(chat_index)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Sort messages by created_at in descending order (newest first)
    sorted_messages = sorted(session.messages, key=lambda x: x.created_at, reverse=True)
    # Apply pagination
    paginated_messages = sorted_messages[offset:offset + limit]
    
    return {
        "messages": paginated_messages,
        "total": len(sorted_messages),
        "has_more": offset + limit < len(sorted_messages)
    }


@router.post("/chat-sessions/{chat_index}/send-message")
async def send_message_to_chat_session(chat_index: int, request: ChatMessageRequest):
    """Send a message to a chat session and get AI response"""
    try:
        # First, add the user message to the chat session
        user_message = ChatSnippet(
            id=create_id(),
            user_id=request.user_id,
            message=request.message,
            model=request.model,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        success = add_message_to_chat_session(chat_index, user_message)
        if not success:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        # Get AI response
        ai_response = await ollama_service.query_ollama(request.message, 30.0, request.model)
        
        # Add AI response to chat session
        ai_message = ChatSnippet(
            id=create_id(),
            user_id="assistant",
            message=ai_response,
            model=request.model,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        add_message_to_chat_session(chat_index, ai_message)
        
        return {
            "status": "success",
            "user_message": user_message,
            "ai_response": ai_message
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}") 