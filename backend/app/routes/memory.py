from fastapi import APIRouter, HTTPException
from app.models.schemas import MemoryRequest
from app.services.database_service import database_service

router = APIRouter(prefix="/api", tags=["memory"])


@router.get("/memory")
async def get_memory():
    """Get memory entries"""
    return {"entries": database_service.get_memory_entries()}


@router.post("/memory")
async def save_memory_entries(request: MemoryRequest):
    """Save memory entries to the database"""
    try:
        # Overwrite all memory entries (for simplicity)
        # First, delete all existing entries
        existing = database_service.get_memory_entries()
        for entry in existing:
            database_service.delete_memory_entry(entry["key"])
        # Add new entries
        for entry in request.entries:
            database_service.add_memory_entry(entry.key, entry.value)
        return {"status": "success", "message": "Memory saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save memory: {str(e)}")
