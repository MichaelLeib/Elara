# backend/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx
import json
import traceback
import platform
import psutil
import asyncio
from datetime import datetime
from storage.fileOperations import create_chat_snippet, get_chat_snippets, create_new_chat_session, get_all_chat_sessions, load_chat_session, delete_chat_session, update_chat_session_title, add_message_to_chat_session, ChatSnippet, create_id, get_next_chat_index

#region app setup

app = FastAPI()

#endregion

# region settings

# Load settings with error handling
try:
    with open("storage/settings.json", "r") as f:
        settings = json.load(f)
    OLLAMA_URL = settings["model"]["OLLAMA_URL"]
    OLLAMA_MODEL = settings["model"]["OLLAMA_MODEL"]
except (FileNotFoundError, KeyError, json.JSONDecodeError) as e:
    print(f"Warning: Could not load settings.json: {e}")
    print("Using default settings...")
    OLLAMA_URL = "http://localhost:11434/api/generate"
    OLLAMA_MODEL = "tinyllama:1.1b"

# endregion

# region Models

# region Pydantic model for request validation
class ChatRequest(BaseModel):
    message: str
    model: str = OLLAMA_MODEL
    timeout: float = 30.0

class ChatResponse(BaseModel):
    response: str
    model: str

# Pydantic model for WebSocket messages
class WebSocketMessage(BaseModel):
    message: str
    model: str = OLLAMA_MODEL

class MemoryEntry(BaseModel):
    key: str
    value: str

class MemoryRequest(BaseModel):
    entries: list[MemoryEntry]

class ModelDownloadRequest(BaseModel):
    model_name: str

class ChatSessionRequest(BaseModel):
    title: str | None = None

class ChatSessionUpdateRequest(BaseModel):
    title: str

class ChatMessageRequest(BaseModel):
    chat_index: int
    message: str
    user_id: str
    model: str

# endregion

#region middleware and exception handlers

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions and return them as JSON responses"""
    # Get full traceback
    full_traceback = traceback.format_exc()
    
    error_detail = {
        "error": str(exc),
        "type": type(exc).__name__,
        "path": request.url.path,
        "method": request.method,
        "traceback": full_traceback,
        "args": exc.args if hasattr(exc, 'args') else None
    }
    
    # Log the full error details for debugging
    print(f"=== UNHANDLED EXCEPTION ===")
    print(f"Error: {exc}")
    print(f"Type: {type(exc).__name__}")
    print(f"Path: {request.url.path}")
    print(f"Method: {request.method}")
    print(f"Full Traceback:")
    print(full_traceback)
    print(f"=== END EXCEPTION ===")
    
    return JSONResponse(
        status_code=500,
        content=error_detail
    )

#endregion

#region methods

async def query_ollama(prompt: str, timeout: float, model: str = OLLAMA_MODEL):
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                OLLAMA_URL,
                json={"model": model, "prompt": prompt, "stream": False}
            )
            response.raise_for_status()
			
            return response.json()["response"]
    except httpx.ConnectError as e:
        raise Exception(f"Could not connect to Ollama at {OLLAMA_URL}. Make sure Ollama is running: {str(e)}")
    except httpx.TimeoutException as e:
        raise Exception(f"Request to Ollama timed out. The model '{model}' might be too slow or not responding: {str(e)}")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise Exception(f"Model '{model}' not found. Available models: {await get_available_models()}")
        elif e.response.status_code == 500:
            raise Exception(f"Ollama server error: {e.response.text}")
        else:
            raise Exception(f"HTTP error {e.response.status_code}: {e.response.text}")
    except Exception as e:
        raise Exception(f"Unexpected error querying Ollama: {str(e)}")

async def get_available_models():
    """Get list of available models for error messages"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:11434/api/tags")
            if response.status_code == 200:
                models_data = response.json()
                if "models" in models_data:
                    return ", ".join([model["name"] for model in models_data["models"]])
                return "No models found"
            return "Could not fetch models"
    except:
        return "Could not fetch models"

async def query_ollama_stream(prompt: str, timeout: float, model: str = OLLAMA_MODEL):
    """Query Ollama with streaming enabled"""
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                OLLAMA_URL,
                json={"model": model, "prompt": prompt, "stream": True}
            ) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            if "response" in data:
                                yield data["response"]
                            if data.get("done", False):
                                break
                        except json.JSONDecodeError:
                            continue
                            
    except httpx.ConnectError as e:
        raise Exception(f"Could not connect to Ollama at {OLLAMA_URL}. Make sure Ollama is running: {str(e)}")
    except httpx.TimeoutException as e:
        raise Exception(f"Request to Ollama timed out. The model '{model}' might be too slow or not responding: {str(e)}")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise Exception(f"Model '{model}' not found. Available models: {await get_available_models()}")
        elif e.response.status_code == 500:
            raise Exception(f"Ollama server error: {e.response.text}")
        else:
            raise Exception(f"HTTP error {e.response.status_code}: {e.response.text}")
    except Exception as e:
        raise Exception(f"Unexpected error querying Ollama: {str(e)}")

def get_system_info():
    """Get system hardware information for model recommendations"""
    try:
        cpu_count = psutil.cpu_count()
        memory_gb = psutil.virtual_memory().total / (1024**3)
        platform_name = platform.system()
        
        return {
            "cpu_count": cpu_count,
            "memory_gb": round(memory_gb, 1),
            "platform": platform_name,
            "architecture": platform.machine()
        }
    except Exception as e:
        print(f"Error getting system info: {e}")
        return {
            "cpu_count": 4,
            "memory_gb": 8.0,
            "platform": "unknown",
            "architecture": "unknown"
        }

def get_model_recommendations(system_info):
    """Get model recommendations based on hardware"""
    cpu_count = system_info["cpu_count"]
    memory_gb = system_info["memory_gb"]
    
    models = json.loads(open("storage/ai-models.json").read())
    
    # Filter and rank models based on hardware
    if memory_gb < 4:
        # Low memory systems
        recommended = [m for m in models if m["name"] in [
            "llama3.2:1b", "tinyllama:1.1b"
        ]]
    elif memory_gb < 8:
        # Medium memory systems
        recommended = [m for m in models if m["name"] in [
            "llama3.2:1b", "llama3.2:3b", "phi3:mini", "gemma:2b"
        ]]
    elif memory_gb < 16:
        # High memory systems
        recommended = [m for m in models if m["name"] in [
            "llama3.2:3b", "llama3.2:8b", "llava:7b", "codellama:7b", 
            "mistral:7b", "gemma2:9b", "qwen2.5:7b", "qwen2.5-coder:3b"
        ]]
    else:
        # Workstation systems
        recommended = [m for m in models if m["name"] in [
            "llama3.2:8b", "llama3.2:70b", "llava:7b", "codellama:7b",
            "mistral:7b", "gemma2:9b", "qwen2.5:7b", "phi3:14b", 
            "deepseek-coder:6.7b", "qwen2.5-coder:3b"
        ]]
    
    # Add recommendation flag
    for model in models:
        model["recommended"] = model in recommended
    
    return models

def load_memory():
    """Load memory entries from JSON file"""
    try:
        with open("storage/memory.json", "r") as f:
            data = json.load(f)
            return data.get("entries", [])
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_memory(entries):
    """Save memory entries to JSON file"""
    try:
        with open("storage/memory.json", "w") as f:
            json.dump({"entries": entries}, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving memory: {e}")
        return False

#endregion

#region websocket endpoint

@app.websocket("/api/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive text data
            data = await websocket.receive_text()
            
            # Try to parse as JSON for model selection, fallback to plain text
            try:
                import json
                parsed_data = json.loads(data)
                print(parsed_data)
                if isinstance(parsed_data, dict):
                    message = parsed_data.get("message", data)
                    model = parsed_data.get("model", OLLAMA_MODEL)
                    chat_index = parsed_data.get("chat_index", None)
                else:
                    message = data
                    model = OLLAMA_MODEL
                    chat_index = None
            except json.JSONDecodeError:
                # If not JSON, treat as plain message
                message = data
                model = OLLAMA_MODEL
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
                async for chunk in query_ollama_stream(message, 10.0, model):
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

@app.websocket("/api/chat-sessions/{chat_index}/ws")
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
                    model = parsed_data.get("model", OLLAMA_MODEL)
                else:
                    message = data
                    model = OLLAMA_MODEL
            except json.JSONDecodeError:
                # If not JSON, treat as plain message
                message = data
                model = OLLAMA_MODEL
            
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
                async for chunk in query_ollama_stream(message, 10.0, model):
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

#endregion

#region REST endpoints

#REST endpoint for chat history
@app.get("/api/chat-history")
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

@app.get("/api/chat-sessions")
async def get_chat_sessions():
    """Get all chat sessions"""
    return {"sessions": get_all_chat_sessions()}

@app.post("/api/chat-sessions")
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

@app.get("/api/chat-sessions/{chat_index}")
async def get_chat_session(chat_index: int):
    """Get a specific chat session by index"""
    session = load_chat_session(chat_index)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session

@app.put("/api/chat-sessions/{chat_index}/title")
async def update_chat_session_title_endpoint(chat_index: int, request: ChatSessionUpdateRequest):
    """Update the title of a chat session"""
    success = update_chat_session_title(chat_index, request.title)
    if not success:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {"status": "success", "message": "Title updated successfully"}

@app.delete("/api/chat-sessions/{chat_index}")
async def delete_chat_session_endpoint(chat_index: int):
    """Delete a chat session"""
    success = delete_chat_session(chat_index)
    if not success:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {"status": "success", "message": "Chat session deleted successfully"}

@app.post("/api/chat-sessions/{chat_index}/messages")
async def add_message_to_chat_session_endpoint(chat_index: int, request: ChatMessageRequest):
    """Add a message to a chat session"""
    from storage.fileOperations import ChatSnippet, create_id
    from datetime import datetime
    
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

@app.get("/api/chat-sessions/{chat_index}/messages")
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

@app.post("/api/chat-sessions/{chat_index}/send-message")
async def send_message_to_chat_session(chat_index: int, request: ChatMessageRequest):
    """Send a message to a chat session and get AI response"""
    try:
        # First, add the user message to the chat session
        from storage.fileOperations import ChatSnippet, create_id
        from datetime import datetime
        
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
        ai_response = await query_ollama(request.message, 30.0, request.model)
        
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

# Memory management endpoints
@app.get("/api/memory")
async def get_memory():
    """Get memory entries"""
    return {"entries": load_memory()}

@app.post("/api/memory")
async def save_memory_entries(request: MemoryRequest):
    """Save memory entries to JSON file"""
    try:
        save_memory(request.entries)
        return {"status": "success", "message": "Memory saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save memory: {str(e)}")

@app.get("/api/system-info")
async def get_system_info_endpoint():
    """Get system hardware information"""
    try:
        return get_system_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system info: {str(e)}")

# Model management endpoints
@app.get("/api/models/available")
async def get_available_ollama_models():
    """Get all available models from Ollama library with recommendations"""
    try:
        # Get system info for recommendations
        system_info = get_system_info()
        recommendations = get_model_recommendations(system_info)
        
        # Get currently installed models
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:11434/api/tags")
            response.raise_for_status()
            installed_models_data = response.json()
            
            # Create a set of installed model names
            installed_names = {model["name"] for model in installed_models_data.get("models", [])}
            
            # Mark which models are installed in our recommendations
            for model in recommendations:
                model["installed"] = model["name"] in installed_names
            
            # Separate installed and available models from our recommendations
            installed_models_list = []
            available_models_list = []
            
            for model in recommendations:
                if model["installed"]:
                    installed_models_list.append(model)
                else:
                    available_models_list.append(model)
            
            # Add any installed models that are not in our recommendations
            for installed_model in installed_models_data.get("models", []):
                model_name = installed_model["name"]
                if not any(model["name"] == model_name for model in recommendations):
                    # Create a basic model entry for installed models not in our list
                    basic_model = {
                        "name": model_name,
                        "description": f"Installed model: {model_name}",
                        "strengths": ["Already installed", "Ready to use"],
                        "weaknesses": ["Limited information available"],
                        "best_for": ["General use"],
                        "recommended_for": "Any hardware",
                        "recommended": False,
                        "installed": True,
                        "details": installed_model.get("details", {})
                    }
                    installed_models_list.append(basic_model)
            
            return {
                "installed_models": installed_models_list,
                "available_models": available_models_list,
                "system_info": system_info
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(e)}")

@app.post("/api/models/download")
async def download_model(request: ModelDownloadRequest):
    """Download a model to Ollama"""
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:  # 5 minute timeout
            response = await client.post(
                "http://localhost:11434/api/pull",
                json={"name": request.model_name}
            )
            response.raise_for_status()
            return {"status": "success", "message": f"Model {request.model_name} downloaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download model: {str(e)}")

@app.delete("/api/models/{model_name}")
async def remove_model(model_name: str):
    """Remove a model from Ollama"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.delete(
                f"http://localhost:11434/api/delete",
                params={"name": model_name}
            )
            response.raise_for_status()
            return {"status": "success", "message": f"Model {model_name} removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove model: {str(e)}")

@app.get("/api/models/download-status/{model_name}")
async def get_download_status(model_name: str):
    """Get download status for a model"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"http://localhost:11434/api/pull?name={model_name}")
            if response.status_code == 200:
                return {"status": "downloading", "progress": "unknown"}
            else:
                return {"status": "error", "message": "Download failed"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Health check endpoint
@app.get("/health")
async def health_check():
    """Check if the service is running"""
    return {"status": "healthy", "service": "chat-api", "default_model": OLLAMA_MODEL}

# Get available models endpoint
@app.get("/api/models")
async def get_models():
    """Get list of available Ollama models"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:11434/api/tags")
            response.raise_for_status()
            return response.json()
    except Exception as e:
        error_detail = {
            "error": str(e),
            "type": type(e).__name__,
            "endpoint": "http://localhost:11434/api/tags",
            "message": "Failed to fetch available models from Ollama"
        }
        raise HTTPException(status_code=500, detail=error_detail)

# Get model info endpoint
@app.get("/api/model-info/{model_name}")
async def get_model_info(model_name: str):
    """Get information about the default Ollama model"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"http://localhost:11434/api/show", json={"name": model_name})
            response.raise_for_status()
            return response.json()
    except Exception as e:
        error_detail = {
            "error": str(e),
            "type": type(e).__name__,
            "endpoint": f"http://localhost:11434/api/show",
            "message": "Failed to fetch model info from Ollama"
        }
        raise HTTPException(status_code=500, detail=error_detail)

# Get running models endpoint
@app.get("/api/running-models")
async def get_running_models():
    """Get list of running Ollama models"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:11434/api/ps")
            response.raise_for_status()
            return response.json()
    except Exception as e:
        error_detail = {
            "error": str(e),
            "type": type(e).__name__,
            "endpoint": "http://localhost:11434/api/ps",
            "message": "Failed to fetch running models from Ollama"
        }
        raise HTTPException(status_code=500, detail=error_detail)

# Diagnostic endpoint
@app.get("/api/diagnostic")
async def diagnostic():
    """Diagnostic information about Ollama connection and models"""
    diagnostic_info = {
        "ollama_url": OLLAMA_URL,
        "default_model": OLLAMA_MODEL,
        "ollama_status": "unknown",
        "available_models": [],
        "running_models": [],
        "errors": []
    }
    
    try:
        # Test Ollama connection
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:11434/api/tags")
            if response.status_code == 200:
                diagnostic_info["ollama_status"] = "connected"
                models_data = response.json()
                if "models" in models_data:
                    diagnostic_info["available_models"] = [model["name"] for model in models_data["models"]]
            else:
                diagnostic_info["ollama_status"] = f"error_{response.status_code}"
                diagnostic_info["errors"].append(f"Ollama API returned status {response.status_code}")
    except Exception as e:
        diagnostic_info["ollama_status"] = "disconnected"
        diagnostic_info["errors"].append(f"Could not connect to Ollama: {str(e)}")
    
    try:
        # Get running models
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:11434/api/ps")
            if response.status_code == 200:
                ps_data = response.json()
                if "models" in ps_data:
                    diagnostic_info["running_models"] = [model["name"] for model in ps_data["models"]]
    except Exception as e:
        diagnostic_info["errors"].append(f"Could not fetch running models: {str(e)}")
    
    return diagnostic_info

#endregion

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
