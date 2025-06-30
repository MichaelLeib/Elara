from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.models.schemas import MemoryRequest
from app.services.database_service import database_service
from app.services.user_info_extractor import user_info_extractor


class UserInfoExtractRequest(BaseModel):
    message: str
    model: Optional[str] = None


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


@router.get("/user-info")
async def get_user_info_summary():
    """Get a summary of all extracted user information"""
    try:
        summary = user_info_extractor.get_user_info_summary()
        return summary
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get user info summary: {str(e)}"
        )


@router.post("/user-info/extract")
async def extract_user_info_from_message(request: UserInfoExtractRequest):
    """Manually extract user information from a message"""
    try:
        if not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        result = await user_info_extractor.process_and_save_user_info(
            user_message=request.message, model=request.model
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to extract user info: {str(e)}"
        )


@router.get("/user-info/categories")
async def get_user_info_categories():
    """Get all user information organized by categories"""
    try:
        summary = user_info_extractor.get_user_info_summary()
        if summary["status"] == "success":
            return {
                "status": "success",
                "categories": summary["categories"],
                "category_count": summary["category_count"],
            }
        else:
            raise HTTPException(
                status_code=500, detail=summary.get("error", "Unknown error")
            )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get user info categories: {str(e)}"
        )


@router.delete("/user-info/{key}")
async def delete_user_info_entry(key: str):
    """Delete a specific user information entry"""
    try:
        success = database_service.delete_memory_entry(key)
        if success:
            return {
                "status": "success",
                "message": f"Entry '{key}' deleted successfully",
            }
        else:
            raise HTTPException(status_code=404, detail=f"Entry '{key}' not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete entry: {str(e)}")
