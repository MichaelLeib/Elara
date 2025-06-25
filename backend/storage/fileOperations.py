#region pydantic models

from datetime import datetime
import json
import uuid
import os
import glob
from pydantic import BaseModel

#region settings

#load settings
with open("storage/settings.json", "r") as f:
    settings = json.load(f)

MEMORY_FILE = settings["model"]["MEMORY_FILE"]
CHAT_FILE = settings["model"]["CHAT_FILE"]

#endregion

class ChatSnippet(BaseModel):
	id: str
	user_id: str
	message: str
	model: str
	created_at: datetime
	updated_at: datetime

class MemorySnippet(BaseModel):
	id: str
	message: str

class ChatSession(BaseModel):
	id: str
	title: str
	messages: list[ChatSnippet]
	created_at: datetime
	updated_at: datetime

#endregion

#region methods

def create_id() -> str:
    return str(uuid.uuid4())

def create_memory_snippet(message: str) -> MemorySnippet:
	snippets = read_memory_file(MEMORY_FILE)
	snippet = MemorySnippet(id=create_id(), message=message)
	snippets.append(snippet)
	write_memory_file(MEMORY_FILE, snippets)
	return snippet

def create_chat_snippet(message: str, user_id: str, model: str) -> ChatSnippet:
	snippets = read_chat_file(CHAT_FILE)
	snippet = ChatSnippet(id=create_id(), user_id=user_id, message=message, model=model, created_at=datetime.now(), updated_at=datetime.now())
	snippets.append(snippet)
	write_chat_file(CHAT_FILE, snippets)
	return snippet

def update_memory_snippet(snippet: MemorySnippet) -> MemorySnippet:
	snippets = read_memory_file(MEMORY_FILE)
	snippetToUpdate = next((s for s in snippets if s.id == snippet.id), None)
	if snippetToUpdate:
		snippetToUpdate.message = snippet.message
		write_memory_file(MEMORY_FILE, snippets)
		return snippetToUpdate
	return snippet

def update_chat_snippet(snippet: ChatSnippet) -> ChatSnippet:
	snippets = read_chat_file(CHAT_FILE)
	snippetToUpdate = next((s for s in snippets if s.id == snippet.id), None)
	if snippetToUpdate:
		snippetToUpdate.message = snippet.message
		write_chat_file(CHAT_FILE, snippets)
		return snippetToUpdate
	return snippet

def delete_memory_snippet(snippet: MemorySnippet) -> None:
	snippets = read_memory_file(MEMORY_FILE)
	snippets = [s for s in snippets if s.id != snippet.id]
	write_memory_file(MEMORY_FILE, snippets)

def delete_chat_snippet(snippet: ChatSnippet) -> None:
	snippets = read_chat_file(CHAT_FILE)
	snippets = [s for s in snippets if s.id != snippet.id]
	write_chat_file(CHAT_FILE, snippets)

def get_memory_snippet(id: str) -> MemorySnippet | None:
	snippets = read_memory_file(MEMORY_FILE)
	return next((snippet for snippet in snippets if snippet.id == id), None)

def get_chat_snippet(id: str) -> ChatSnippet | None:
	snippets = read_chat_file(CHAT_FILE)
	return next((snippet for snippet in snippets if snippet.id == id), None)

def get_memory_snippets() -> list[MemorySnippet]:
	snippets = read_memory_file(MEMORY_FILE)
	return snippets

def get_chat_snippets() -> list[ChatSnippet]:
	snippets = read_chat_file(CHAT_FILE)
	return snippets

# New methods for chat session management
def get_next_chat_index() -> int:
    """Get the next available chat index by finding the highest index from existing files"""
    chat_dir = "storage/chat-history"
    if not os.path.exists(chat_dir):
        os.makedirs(chat_dir)
        return 1
    
    # Find all Chat-*.json files
    pattern = os.path.join(chat_dir, "Chat-*.json")
    files = glob.glob(pattern)
    
    if not files:
        return 1
    
    # Extract indices from filenames
    indices = []
    for file in files:
        try:
            filename = os.path.basename(file)
            index_str = filename.replace("Chat-", "").replace(".json", "")
            indices.append(int(index_str))
        except ValueError:
            continue
    
    return max(indices) + 1 if indices else 1

def create_new_chat_session(title: str | None = None) -> ChatSession:
    """Create a new chat session with the next available index"""
    chat_index = get_next_chat_index()
    if not title:
        title = f"Chat-{chat_index}"
    
    session = ChatSession(
        id=create_id(),
        title=title,
        messages=[],
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    # Save to file
    save_chat_session(session, chat_index)
    return session

def save_chat_session(session: ChatSession, chat_index: int | None = None) -> None:
    """Save a chat session to file"""
    if chat_index is None:
        # Try to extract index from title
        try:
            chat_index = int(session.title.replace("Chat-", ""))
        except ValueError:
            chat_index = get_next_chat_index()
    
    chat_dir = "storage/chat-history"
    if not os.path.exists(chat_dir):
        os.makedirs(chat_dir)
    
    file_path = os.path.join(chat_dir, f"Chat-{chat_index}.json")
    session.updated_at = datetime.now()
    
    with open(file_path, 'w') as f:
        json.dump(session.model_dump(), f, indent=2, default=str)

def load_chat_session(chat_index: int) -> ChatSession | None:
    """Load a chat session by index"""
    chat_dir = "storage/chat-history"
    file_path = os.path.join(chat_dir, f"Chat-{chat_index}.json")
    
    if not os.path.exists(file_path):
        return None
    
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
            # Convert string dates back to datetime objects
            data['created_at'] = datetime.fromisoformat(data['created_at'])
            data['updated_at'] = datetime.fromisoformat(data['updated_at'])
            for message in data['messages']:
                message['created_at'] = datetime.fromisoformat(message['created_at'])
                message['updated_at'] = datetime.fromisoformat(message['updated_at'])
            return ChatSession.model_validate(data)
    except Exception as e:
        print(f"Error loading chat session {chat_index}: {e}")
        return None

def get_all_chat_sessions() -> list[dict]:
    """Get all chat sessions with their metadata"""
    chat_dir = "storage/chat-history"
    if not os.path.exists(chat_dir):
        return []
    
    sessions = []
    pattern = os.path.join(chat_dir, "Chat-*.json")
    files = glob.glob(pattern)
    
    for file in files:
        try:
            filename = os.path.basename(file)
            index_str = filename.replace("Chat-", "").replace(".json", "")
            chat_index = int(index_str)
            
            session = load_chat_session(chat_index)
            if session:
                sessions.append({
                    "index": chat_index,
                    "id": session.id,
                    "title": session.title,
                    "message_count": len(session.messages),
                    "created_at": session.created_at,
                    "updated_at": session.updated_at
                })
        except ValueError:
            continue
    
    # Sort by index
    sessions.sort(key=lambda x: x["index"])
    return sessions

def delete_chat_session(chat_index: int) -> bool:
    """Delete a chat session by index"""
    chat_dir = "storage/chat-history"
    file_path = os.path.join(chat_dir, f"Chat-{chat_index}.json")
    
    if os.path.exists(file_path):
        os.remove(file_path)
        return True
    return False

def update_chat_session_title(chat_index: int, new_title: str) -> bool:
    """Update the title of a chat session"""
    session = load_chat_session(chat_index)
    if session:
        session.title = new_title
        save_chat_session(session, chat_index)
        return True
    return False

def add_message_to_chat_session(chat_index: int, message: ChatSnippet) -> bool:
    """Add a message to a chat session"""
    session = load_chat_session(chat_index)
    if session:
        session.messages.append(message)
        session.updated_at = datetime.now()
        save_chat_session(session, chat_index)
        return True
    return False

#endregion

# region read and write operations

def read_memory_file(file_path: str) -> list[MemorySnippet]:
    try:
        with open(file_path, 'r') as file:
            return [MemorySnippet.model_validate_json(line) for line in file]
    except FileNotFoundError:
        return []

def write_memory_file(file_path: str, snippets: list[MemorySnippet]):
    with open(file_path, 'w') as file:
        for snippet in snippets:
            file.write(snippet.model_dump_json() + '\n')

def read_chat_file(file_path: str) -> list[ChatSnippet]:
    try:
        with open(file_path, 'r') as file:
            return [ChatSnippet.model_validate_json(line) for line in file]
    except FileNotFoundError:
        return []

def write_chat_file(file_path: str, snippets: list[ChatSnippet]):
    with open(file_path, 'w') as file:
        for snippet in snippets:
            file.write(snippet.model_dump_json() + '\n')
#endregion

