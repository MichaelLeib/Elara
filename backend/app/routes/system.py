from fastapi import APIRouter, Request
from app.services.system_service import system_service
from app.config.settings import settings

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
            "error": str(e),
        }


@router.get("/settings")
async def get_settings():
    return {
        "OLLAMA_URL": settings.OLLAMA_URL,
        "OLLAMA_MODEL": settings.OLLAMA_MODEL,
        "timeout": settings.timeout,
        "message_limit": settings.message_limit,
        "message_offset": settings.message_offset,
        "manual_model_switch": settings.manual_model_switch,
        "summarization_prompt": settings.summarization_prompt,
    }


@router.post("/settings")
async def update_settings(request: Request):
    data = await request.json()
    ollama_url = data.get("OLLAMA_URL")
    ollama_model = data.get("OLLAMA_MODEL")
    timeout = data.get("timeout")
    message_limit = data.get("message_limit")
    message_offset = data.get("message_offset")
    manual_model_switch = data.get("manual_model_switch")
    summarization_prompt = data.get("summarization_prompt")
    settings.update_settings(
        ollama_url=ollama_url,
        ollama_model=ollama_model,
        timeout=timeout,
        message_limit=message_limit,
        message_offset=message_offset,
        manual_model_switch=manual_model_switch,
        summarization_prompt=summarization_prompt,
    )
    return {
        "OLLAMA_URL": settings.OLLAMA_URL,
        "OLLAMA_MODEL": settings.OLLAMA_MODEL,
        "timeout": settings.timeout,
        "message_limit": settings.message_limit,
        "message_offset": settings.message_offset,
        "manual_model_switch": settings.manual_model_switch,
        "summarization_prompt": settings.summarization_prompt,
    }
