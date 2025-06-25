from fastapi import APIRouter
from app.services.system_service import system_service

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/system-info")
async def get_system_info_endpoint():
    """Get system hardware information"""
    try:
        return system_service.get_system_info()
    except Exception as e:
        return {
            "cpu_count": 4,
            "memory_gb": 8.0,
            "platform": "unknown",
            "architecture": "unknown",
            "error": str(e)
        } 