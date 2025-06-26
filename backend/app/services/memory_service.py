from typing import List, Dict, Any, Optional
from app.models.schemas import MemoryEntry
from app.services.database_service import database_service


class MemoryService:
    """Service for managing memory entries using the database"""

    def load_memory(self) -> List[Dict[str, str]]:
        """Load memory entries from database"""
        entries = database_service.get_memory_entries()
        # Convert to the expected format for backward compatibility
        return [{"key": entry["key"], "value": entry["value"]} for entry in entries]

    def save_memory(self, entries: List[MemoryEntry]) -> bool:
        """Save memory entries to database"""
        try:
            # Clear existing entries and add new ones
            existing_entries = database_service.get_memory_entries()
            for entry in existing_entries:
                database_service.delete_memory_entry(entry["key"])

            # Add new entries
            for entry in entries:
                database_service.add_memory_entry(
                    key=entry.key,
                    value=entry.value,
                    importance=5,  # Default importance
                    category="user_defined",
                )
            return True
        except Exception as e:
            print(f"Error saving memory: {e}")
            return False

    def add_memory_entry(
        self, key: str, value: str, importance: int = 5, category: Optional[str] = None
    ) -> bool:
        """Add a single memory entry to database"""
        try:
            database_service.add_memory_entry(
                key=key,
                value=value,
                importance=importance,
                category=category or "user_defined",
            )
            return True
        except Exception as e:
            print(f"Error adding memory entry: {e}")
            return False

    def get_memory_entry(self, key: str) -> str:
        """Get a memory entry by key from database"""
        entry = database_service.get_memory_entry(key)
        return entry["value"] if entry else ""

    def delete_memory_entry(self, key: str) -> bool:
        """Delete a memory entry by key from database"""
        return database_service.delete_memory_entry(key)

    def get_memory_entries(
        self, category: Optional[str] = None, limit: int = 100
    ) -> List[Dict]:
        """Get memory entries from database, optionally filtered by category"""
        return database_service.get_memory_entries(category=category, limit=limit)

    def get_important_memory(self, limit: int = 20) -> List[Dict]:
        """Get important memory entries for context"""
        return database_service.get_important_memory(limit=limit)


# Global service instance
memory_service = MemoryService()
