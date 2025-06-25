from fastapi import APIRouter, HTTPException
from app.models.schemas import MemoryRequest
from app.services.memory_service import memory_service

router = APIRouter(prefix="/api", tags=["memory"])


@router.get("/memory")
async def get_memory():
    """Get memory entries"""
    return {"entries": memory_service.load_memory()}


@router.post("/memory")
async def save_memory_entries(request: MemoryRequest):
    """Save memory entries to JSON file"""
    try:
        success = memory_service.save_memory(request.entries)
        if success:
            return {"status": "success", "message": "Memory saved successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to save memory")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save memory: {str(e)}") 