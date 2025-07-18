import sqlite3
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from app.models.schemas import MemoryEntry, ChatSession

# Optional numpy import for embeddings
try:
    import numpy as np

    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    np = None


class DatabaseService:
    """SQLite database service optimized for AI chat applications"""

    def __init__(self, db_path: str = "storage/elara.db"):
        self.db_path = db_path
        self._ensure_db_directory()
        self._init_database()

    def _ensure_db_directory(self):
        """Ensure the database directory exists"""
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

    def _init_database(self):
        """Initialize database with schema"""
        with sqlite3.connect(self.db_path) as conn:
            # Read and execute schema
            schema_path = Path(__file__).parent.parent.parent / "database_schema.sql"
            if schema_path.exists():
                with open(schema_path, "r") as f:
                    schema = f.read()
                conn.executescript(schema)

            # Handle migration for adding files column to messages_meta table
            try:
                # Check if files column exists
                cursor = conn.execute("PRAGMA table_info(messages_meta)")
                columns = [column[1] for column in cursor.fetchall()]

                if "files" not in columns:
                    print("Adding files column to messages_meta table...")
                    conn.execute("ALTER TABLE messages_meta ADD COLUMN files TEXT")
                    print("Files column added successfully")
            except Exception as e:
                print(f"Migration error (this is normal for new databases): {e}")

            conn.commit()

    def _get_connection(self):
        """Get database connection with proper configuration"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Enable dict-like access
        return conn

    # Chat Session Operations
    def create_chat_session(
        self,
        title: str,
        model: str,
        is_private: bool = True,
        metadata: Optional[Dict] = None,
    ) -> str:
        """Create a new chat session"""
        session_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            conn.execute(
                "INSERT INTO chat_sessions (id, title, model, is_private, metadata) VALUES (?, ?, ?, ?, ?)",
                (
                    session_id,
                    title,
                    model,
                    is_private,
                    json.dumps(metadata) if metadata else None,
                ),
            )
            conn.commit()
        return session_id

    def get_chat_session(self, session_id: str) -> Optional[Dict]:
        """Get chat session by ID with message count"""
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT 
                    cs.*,
                    COALESCE(COUNT(mm.id), 0) as message_count
                FROM chat_sessions cs
                LEFT JOIN messages_meta mm ON cs.id = mm.chat_id
                WHERE cs.id = ?
                GROUP BY cs.id
                """,
                (session_id,),
            )
            row = cursor.fetchone()
            if row:
                data = dict(row)
                if data.get("metadata"):
                    data["metadata"] = json.loads(data["metadata"])
                # Ensure message_count is an integer
                data["message_count"] = int(data.get("message_count", 0))
                return data
        return None

    def get_chat_sessions(self, limit: int = 50) -> List[Dict]:
        """Get recent chat sessions with message count"""
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT 
                    cs.*,
                    COALESCE(COUNT(mm.id), 0) as message_count
                FROM chat_sessions cs
                LEFT JOIN messages_meta mm ON cs.id = mm.chat_id
                GROUP BY cs.id
                ORDER BY cs.updated_at DESC 
                LIMIT ?
                """,
                (limit,),
            )
            sessions = []
            for row in cursor.fetchall():
                data = dict(row)
                if data.get("metadata"):
                    data["metadata"] = json.loads(data["metadata"])
                # Ensure message_count is an integer
                data["message_count"] = int(data.get("message_count", 0))
                sessions.append(data)
            return sessions

    def update_chat_session(
        self,
        session_id: str,
        title: Optional[str] = None,
        metadata: Optional[Dict] = None,
        model: Optional[str] = None,
    ) -> bool:
        """Update chat session with proper parameterized queries"""
        with self._get_connection() as conn:
            updates = []
            params = []

            if title is not None:  # Allow empty string updates
                updates.append("title = ?")
                params.append(title)
            if metadata is not None:
                updates.append("metadata = ?")
                params.append(json.dumps(metadata))
            if model is not None:
                updates.append("model = ?")
                params.append(model)

            if not updates:
                return False
                
            # Always update timestamp when any field is modified
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(session_id)
            
            # Use proper parameterized query construction
            set_clause = ", ".join(updates)
            query = "UPDATE chat_sessions SET " + set_clause + " WHERE id = ?"
            
            cursor = conn.execute(query, params)
            conn.commit()
            return cursor.rowcount > 0

    def delete_chat_session(self, session_id: str) -> bool:
        """Delete chat session and all its messages"""
        with self._get_connection() as conn:
            conn.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
            conn.commit()
            return conn.total_changes > 0

    # Message Operations
    def add_message(
        self,
        chat_id: str,
        user_id: str,
        message: str,
        model: str,
        files: Optional[List[Dict]] = None,
        web_search_sources: Optional[List[Dict]] = None,
    ) -> str:
        """Add a message to a chat session"""
        message_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            # Insert into FTS5 virtual table for search
            conn.execute(
                "INSERT INTO messages (id, chat_id, user_id, message, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                (message_id, chat_id, user_id, message, model),
            )

            # Insert into regular table for foreign key relationships
            conn.execute(
                "INSERT INTO messages_meta (id, chat_id, user_id, model, files, web_search_sources, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                (
                    message_id,
                    chat_id,
                    user_id,
                    model,
                    json.dumps(files) if files else None,
                    json.dumps(web_search_sources) if web_search_sources else None,
                ),
            )

            # Update chat session timestamp and model (to track the last used model)
            conn.execute(
                "UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP, model = ? WHERE id = ?",
                (model, chat_id),
            )
            conn.commit()
        return message_id

    def get_messages(
        self, chat_id: str, limit: int = 50, offset: int = 0
    ) -> List[Dict]:
        """Get messages for a chat session"""
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT m.id, m.chat_id, m.user_id, m.message, m.model, m.created_at, m.updated_at, mm.files, mm.web_search_sources
                FROM messages m
                JOIN messages_meta mm ON m.id = mm.id
                WHERE mm.chat_id = ? 
                ORDER BY mm.created_at DESC 
                LIMIT ? OFFSET ?
                """,
                (chat_id, limit, offset),
            )
            messages = []
            for row in cursor.fetchall():
                data = dict(row)
                # Parse files JSON if present
                if data.get("files"):
                    try:
                        data["files"] = json.loads(data["files"])
                    except json.JSONDecodeError:
                        data["files"] = None
                else:
                    data["files"] = None

                # Parse web_search_sources JSON if present
                if data.get("web_search_sources"):
                    try:
                        data["web_search_sources"] = json.loads(
                            data["web_search_sources"]
                        )
                    except json.JSONDecodeError:
                        data["web_search_sources"] = None
                else:
                    data["web_search_sources"] = None

                messages.append(data)
            return messages

    def get_message_count(self, chat_id: str) -> int:
        """Get total count of messages for a chat session"""
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT COUNT(*) as count
                FROM messages m
                JOIN messages_meta mm ON m.id = mm.id
                WHERE mm.chat_id = ?
                """,
                (chat_id,),
            )
            row = cursor.fetchone()
            return row["count"] if row else 0

    def search_messages(
        self, query: str, chat_id: Optional[str] = None, limit: int = 20
    ) -> List[Dict]:
        """Search messages using full-text search"""
        with self._get_connection() as conn:
            if chat_id:
                cursor = conn.execute(
                    """
                    SELECT m.id, m.chat_id, m.user_id, m.message, m.model, m.created_at, m.updated_at, mm.files, mm.web_search_sources
                    FROM messages m
                    JOIN messages_meta mm ON m.id = mm.id
                    WHERE mm.chat_id = ? AND m.message MATCH ?
                    ORDER BY rank
                    LIMIT ?
                    """,
                    (chat_id, query, limit),
                )
            else:
                cursor = conn.execute(
                    """
                    SELECT m.id, m.chat_id, m.user_id, m.message, m.model, m.created_at, m.updated_at, mm.files, mm.web_search_sources
                    FROM messages m
                    JOIN messages_meta mm ON m.id = mm.id
                    WHERE m.message MATCH ?
                    ORDER BY rank
                    LIMIT ?
                    """,
                    (query, limit),
                )
            messages = []
            for row in cursor.fetchall():
                data = dict(row)
                # Parse files JSON if present
                if data.get("files"):
                    try:
                        data["files"] = json.loads(data["files"])
                    except json.JSONDecodeError:
                        data["files"] = None
                else:
                    data["files"] = None

                # Parse web_search_sources JSON if present
                if data.get("web_search_sources"):
                    try:
                        data["web_search_sources"] = json.loads(
                            data["web_search_sources"]
                        )
                    except json.JSONDecodeError:
                        data["web_search_sources"] = None
                else:
                    data["web_search_sources"] = None

                messages.append(data)
            return messages

    def get_recent_context(self, days: int = 7, limit: int = 20) -> List[Dict]:
        """Get recent messages for context"""
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT m.id, m.chat_id, m.user_id, m.message, m.model, m.created_at, m.updated_at, mm.files
                FROM messages m
                JOIN messages_meta mm ON m.id = mm.id
                WHERE mm.created_at > datetime('now', '-7 days')
                ORDER BY mm.created_at DESC 
                LIMIT ?
                """,
                (limit,),
            )
            messages = []
            for row in cursor.fetchall():
                data = dict(row)
                # Parse files JSON if present
                if data.get("files"):
                    try:
                        data["files"] = json.loads(data["files"])
                    except json.JSONDecodeError:
                        data["files"] = None
                else:
                    data["files"] = None
                messages.append(data)
            return messages

    def get_public_chat_context(self, session_id: str, limit: int = 10) -> Dict:
        """Get context for public chats including summaries and memories"""
        context = {
            "session_summaries": [],
            "conversation_summaries": [],
            "memories": [],
            "recent_messages": [],
        }

        with self._get_connection() as conn:
            # Get session summary
            cursor = conn.execute(
                "SELECT summary_data FROM session_summaries WHERE chat_id = ? ORDER BY created_at DESC LIMIT 1",
                (session_id,),
            )
            session_summary = cursor.fetchone()
            if session_summary:
                context["session_summaries"].append(
                    json.loads(session_summary["summary_data"])
                )

            # Get recent conversation summaries
            cursor = conn.execute(
                """
                SELECT summary_data FROM conversation_summaries 
                WHERE chat_id = ? AND confidence_level IN ('high', 'medium')
                ORDER BY created_at DESC LIMIT ?
                """,
                (session_id, limit),
            )
            for row in cursor.fetchall():
                context["conversation_summaries"].append(
                    json.loads(row["summary_data"])
                )

            # Get important memories
            cursor = conn.execute("SELECT * FROM important_memory LIMIT ?", (limit,))
            for row in cursor.fetchall():
                context["memories"].append(dict(row))

            # Get recent messages from this session
            cursor = conn.execute(
                """
                SELECT m.id, m.chat_id, m.user_id, m.message, m.model, m.created_at, m.updated_at, mm.files
                FROM messages m
                JOIN messages_meta mm ON m.id = mm.id
                WHERE mm.chat_id = ? 
                ORDER BY mm.created_at DESC 
                LIMIT ?
                """,
                (session_id, limit),
            )
            for row in cursor.fetchall():
                data = dict(row)
                # Parse files JSON if present
                if data.get("files"):
                    try:
                        data["files"] = json.loads(data["files"])
                    except json.JSONDecodeError:
                        data["files"] = None
                else:
                    data["files"] = None
                context["recent_messages"].append(data)

        return context

    def get_private_chat_context(self, session_id: str, limit: int = 10) -> Dict:
        """Get context for private chats using only this session's data (isolated)"""
        context = {
            "session_summaries": [],
            "conversation_summaries": [],
            "memories": [],  # Empty for private chats - no global memories
            "recent_messages": [],
        }

        with self._get_connection() as conn:
            # Get session summary (from this session only)
            cursor = conn.execute(
                "SELECT summary_data FROM session_summaries WHERE chat_id = ? ORDER BY created_at DESC LIMIT 1",
                (session_id,),
            )
            session_summary = cursor.fetchone()
            if session_summary:
                context["session_summaries"].append(
                    json.loads(session_summary["summary_data"])
                )

            # Get recent conversation summaries (from this session only)
            cursor = conn.execute(
                """
                SELECT summary_data FROM conversation_summaries 
                WHERE chat_id = ? AND confidence_level IN ('high', 'medium')
                ORDER BY created_at DESC LIMIT ?
                """,
                (session_id, limit),
            )
            for row in cursor.fetchall():
                context["conversation_summaries"].append(
                    json.loads(row["summary_data"])
                )

            # Private chats don't get global memories - they're isolated
            # context["memories"] remains empty

            # Get recent messages from this session only
            cursor = conn.execute(
                """
                SELECT m.id, m.chat_id, m.user_id, m.message, m.model, m.created_at, m.updated_at, mm.files
                FROM messages m
                JOIN messages_meta mm ON m.id = mm.id
                WHERE mm.chat_id = ? 
                ORDER BY mm.created_at DESC 
                LIMIT ?
                """,
                (session_id, limit),
            )
            for row in cursor.fetchall():
                data = dict(row)
                # Parse files JSON if present
                if data.get("files"):
                    try:
                        data["files"] = json.loads(data["files"])
                    except json.JSONDecodeError:
                        data["files"] = None
                else:
                    data["files"] = None
                context["recent_messages"].append(data)

        return context

    # Memory Operations
    def add_memory_entry(
        self, key: str, value: str, importance: int = 1, category: Optional[str] = None
    ) -> str:
        """Add or update a memory entry"""
        memory_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            # Check if key already exists
            cursor = conn.execute("SELECT id FROM memory_entries WHERE key = ?", (key,))
            existing = cursor.fetchone()

            if existing:
                # Update existing entry
                conn.execute(
                    "UPDATE memory_entries SET value = ?, importance = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?",
                    (value, importance, category, key),
                )
                memory_id = existing["id"]
            else:
                # Insert new entry
                conn.execute(
                    "INSERT INTO memory_entries (id, key, value, importance, category) VALUES (?, ?, ?, ?, ?)",
                    (memory_id, key, value, importance, category),
                )
            conn.commit()
        return memory_id

    def get_memory_entry(self, key: str) -> Optional[Dict]:
        """Get memory entry by key"""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM memory_entries WHERE key = ?", (key,))
            row = cursor.fetchone()
            if row:
                # Update last accessed
                conn.execute(
                    "UPDATE memory_entries SET last_accessed = CURRENT_TIMESTAMP WHERE key = ?",
                    (key,),
                )
                conn.commit()
                return dict(row)
        return None

    def get_memory_entries(
        self, category: Optional[str] = None, limit: int = 100
    ) -> List[Dict]:
        """Get memory entries, optionally filtered by category"""
        with self._get_connection() as conn:
            if category:
                cursor = conn.execute(
                    "SELECT * FROM memory_entries WHERE category = ? ORDER BY importance DESC, last_accessed DESC LIMIT ?",
                    (category, limit),
                )
            else:
                cursor = conn.execute(
                    "SELECT * FROM memory_entries ORDER BY importance DESC, last_accessed DESC LIMIT ?",
                    (limit,),
                )
            return [dict(row) for row in cursor.fetchall()]

    def get_important_memory(self, limit: int = 20) -> List[Dict]:
        """Get important memory entries for context"""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM important_memory LIMIT ?", (limit,))
            return [dict(row) for row in cursor.fetchall()]

    def delete_memory_entry(self, key: str) -> bool:
        """Delete memory entry by key"""
        with self._get_connection() as conn:
            conn.execute("DELETE FROM memory_entries WHERE key = ?", (key,))
            conn.commit()
            return conn.total_changes > 0

    # Semantic Search Operations (for future use with embeddings)
    def add_message_embedding(self, message_id: str, embedding: Any, model: str):
        """Add embedding for a message"""
        if not NUMPY_AVAILABLE:
            raise ImportError("numpy is required for embedding operations")

        with self._get_connection() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO message_embeddings (message_id, embedding, embedding_model) VALUES (?, ?, ?)",
                (message_id, embedding.tobytes(), model),
            )
            conn.commit()

    def add_memory_embedding(self, memory_id: str, embedding: Any, model: str):
        """Add embedding for a memory entry"""
        if not NUMPY_AVAILABLE:
            raise ImportError("numpy is required for embedding operations")

        with self._get_connection() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO memory_embeddings (memory_id, embedding, embedding_model) VALUES (?, ?, ?)",
                (memory_id, embedding.tobytes(), model),
            )
            conn.commit()

    def get_similar_messages(self, query_embedding: Any, limit: int = 10) -> List[Dict]:
        """Get messages similar to query embedding (cosine similarity)"""
        # This is a placeholder - would need proper vector similarity implementation
        # Could use extensions like sqlite-vss or implement custom similarity
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT m.*, me.embedding FROM messages m JOIN message_embeddings me ON m.id = me.message_id LIMIT ?",
                (limit,),
            )
            return [dict(row) for row in cursor.fetchall()]

    # Migration from JSON files
    def migrate_from_json(
        self,
        chat_history_dir: str = "storage/chat-history",
        memory_file: str = "storage/memory.json",
    ):
        """Migrate existing JSON data to SQLite"""
        # Migrate chat history
        chat_dir = Path(chat_history_dir)
        if chat_dir.exists():
            for chat_file in chat_dir.glob("*.json"):
                try:
                    with open(chat_file, "r") as f:
                        chat_data = json.load(f)

                    # Create chat session
                    session_id = self.create_chat_session(
                        title=chat_data.get("title", chat_file.stem),
                        model=chat_data.get("model", "unknown"),
                        metadata={"source_file": str(chat_file)},
                    )

                    # Add messages
                    for msg in chat_data.get("messages", []):
                        self.add_message(
                            chat_id=session_id,
                            user_id=msg.get("user_id", "user"),
                            message=msg.get("message", ""),
                            model=msg.get("model", "unknown"),
                        )

                    print(f"Migrated {chat_file.name}")
                except Exception as e:
                    print(f"Error migrating {chat_file.name}: {e}")

        # Migrate memory
        memory_path = Path(memory_file)
        if memory_path.exists():
            try:
                with open(memory_path, "r") as f:
                    memory_data = json.load(f)

                for entry in memory_data.get("entries", []):
                    self.add_memory_entry(
                        key=entry.get("key", ""),
                        value=entry.get("value", ""),
                        importance=5,  # Default importance
                        category="migrated",
                    )

                print(f"Migrated memory from {memory_file}")
            except Exception as e:
                print(f"Error migrating memory: {e}")

    # Summary Operations
    def add_conversation_summary(
        self,
        chat_id: str,
        user_message_id: str,
        assistant_message_id: str,
        summary_data: Dict,
        confidence_level: str,
    ) -> str:
        """Add a conversation summary"""
        summary_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO conversation_summaries 
                (id, chat_id, user_message_id, assistant_message_id, summary_data, confidence_level)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    summary_id,
                    chat_id,
                    user_message_id,
                    assistant_message_id,
                    json.dumps(summary_data),
                    confidence_level,
                ),
            )
            conn.commit()
        return summary_id

    def add_session_summary(
        self,
        chat_id: str,
        summary_data: Dict,
        message_count: int,
        confidence_level: str,
        session_quality: Optional[str] = None,
    ) -> str:
        """Add a session summary"""
        summary_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO session_summaries 
                (id, chat_id, summary_data, message_count, confidence_level, session_quality)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    summary_id,
                    chat_id,
                    json.dumps(summary_data),
                    message_count,
                    confidence_level,
                    session_quality,
                ),
            )
            conn.commit()
        return summary_id

    def get_conversation_summaries(
        self, chat_id: str, limit: int = 50, offset: int = 0
    ) -> List[Dict]:
        """Get conversation summaries for a chat session"""
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT cs.*, 
                       um.message as user_message,
                       am.message as assistant_message
                FROM conversation_summaries cs
                JOIN messages_meta um ON cs.user_message_id = um.id
                JOIN messages_meta am ON cs.assistant_message_id = am.id
                JOIN messages um_msg ON um.id = um_msg.id
                JOIN messages am_msg ON am.id = am_msg.id
                WHERE cs.chat_id = ?
                ORDER BY cs.created_at DESC
                LIMIT ? OFFSET ?
                """,
                (chat_id, limit, offset),
            )
            summaries = []
            for row in cursor.fetchall():
                data = dict(row)
                data["summary_data"] = json.loads(data["summary_data"])
                summaries.append(data)
            return summaries

    def get_session_summary(self, chat_id: str) -> Optional[Dict]:
        """Get the latest session summary for a chat session"""
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT * FROM session_summaries 
                WHERE chat_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1
                """,
                (chat_id,),
            )
            row = cursor.fetchone()
            if row:
                data = dict(row)
                data["summary_data"] = json.loads(data["summary_data"])
                return data
        return None

    def get_high_confidence_summaries(self, limit: int = 20) -> List[Dict]:
        """Get high confidence summaries across all sessions"""
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT cs.*, chat_sessions.title as chat_title
                FROM conversation_summaries cs
                JOIN chat_sessions ON cs.chat_id = chat_sessions.id
                WHERE cs.confidence_level IN ('high', 'medium')
                ORDER BY cs.created_at DESC
                LIMIT ?
                """,
                (limit,),
            )
            summaries = []
            for row in cursor.fetchall():
                data = dict(row)
                data["summary_data"] = json.loads(data["summary_data"])
                summaries.append(data)
            return summaries

    def get_summary_insights(self, chat_id: str, limit: int = 10) -> List[Dict]:
        """Get key insights from summaries for a chat session"""
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT summary_data, confidence_level, created_at
                FROM conversation_summaries
                WHERE chat_id = ? AND confidence_level IN ('high', 'medium')
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (chat_id, limit),
            )
            insights = []
            for row in cursor.fetchall():
                summary_data = json.loads(row["summary_data"])
                insights.extend(summary_data.get("key_insights", []))
            return insights

    def delete_conversation_summary(self, summary_id: str) -> bool:
        """Delete a conversation summary"""
        with self._get_connection() as conn:
            conn.execute(
                "DELETE FROM conversation_summaries WHERE id = ?", (summary_id,)
            )
            conn.commit()
            return conn.total_changes > 0

    def delete_session_summary(self, summary_id: str) -> bool:
        """Delete a session summary"""
        with self._get_connection() as conn:
            conn.execute("DELETE FROM session_summaries WHERE id = ?", (summary_id,))
            conn.commit()
            return conn.total_changes > 0


# Global database service instance
database_service = DatabaseService()
