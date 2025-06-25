import json
from typing import List, Dict, Any
from app.models.schemas import MemoryEntry


class MemoryService:
    """Service for managing memory entries"""
    
    def __init__(self):
        self.memory_file = "storage/memory.json"
    
    def load_memory(self) -> List[Dict[str, str]]:
        """Load memory entries from JSON file"""
        try:
            with open(self.memory_file, "r") as f:
                data = json.load(f)
                return data.get("entries", [])
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def save_memory(self, entries: List[MemoryEntry]) -> bool:
        """Save memory entries to JSON file"""
        try:
            # Convert Pydantic models to dicts
            entries_data = [entry.dict() for entry in entries]
            with open(self.memory_file, "w") as f:
                json.dump({"entries": entries_data}, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving memory: {e}")
            return False
    
    def add_memory_entry(self, key: str, value: str) -> bool:
        """Add a single memory entry"""
        entries = self.load_memory()
        # Check if key already exists
        for entry in entries:
            if entry["key"] == key:
                entry["value"] = value
                return self.save_memory([MemoryEntry(**entry) for entry in entries])
        
        # Add new entry
        new_entry = MemoryEntry(key=key, value=value)
        entries.append(new_entry.dict())
        return self.save_memory([MemoryEntry(**entry) for entry in entries])
    
    def get_memory_entry(self, key: str) -> str:
        """Get a memory entry by key"""
        entries = self.load_memory()
        for entry in entries:
            if entry["key"] == key:
                return entry["value"]
        return ""
    
    def delete_memory_entry(self, key: str) -> bool:
        """Delete a memory entry by key"""
        entries = self.load_memory()
        original_length = len(entries)
        entries = [entry for entry in entries if entry["key"] != key]
        
        if len(entries) < original_length:
            return self.save_memory([MemoryEntry(**entry) for entry in entries])
        return False


# Global service instance
memory_service = MemoryService() 