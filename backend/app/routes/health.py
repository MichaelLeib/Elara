from fastapi import APIRouter
from app.config.settings import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Check if the service is running"""
    return {
        "status": "healthy", 
        "service": "chat-api", 
        "default_model": settings.OLLAMA_MODEL
    } 