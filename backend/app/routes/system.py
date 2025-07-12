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
        "CHAT_MODEL": settings.CHAT_MODEL,
        "FAST_MODEL": settings.FAST_MODEL,
        "SUMMARY_MODEL": settings.SUMMARY_MODEL,
        "USER_INFO_EXTRACTION_MODEL": settings.USER_INFO_EXTRACTION_MODEL,
        "DECISION_MODEL": settings.DECISION_MODEL,
        "DOCUMENT_ANALYSIS_MODEL": settings.DOCUMENT_ANALYSIS_MODEL,
        "VISION_MODEL": settings.VISION_MODEL,
        "VISION_FALLBACK_MODELS": settings.VISION_FALLBACK_MODELS,
        "timeout": settings.timeout,
        "message_limit": settings.message_limit,
        "message_offset": settings.message_offset,
        "manual_model_switch": settings.manual_model_switch,
        "auto_model_selection": getattr(settings, "auto_model_selection", False),
        "summarization_prompt": settings.summarization_prompt,
        "user_info_extraction_model": settings.USER_INFO_EXTRACTION_MODEL,
    }


@router.post("/settings")
async def update_settings(request: Request):
    data = await request.json()
    ollama_url = data.get("OLLAMA_URL")
    ollama_model = data.get("OLLAMA_MODEL")
    chat_model = data.get("CHAT_MODEL")
    fast_model = data.get("FAST_MODEL")
    summary_model = data.get("SUMMARY_MODEL")
    user_info_extraction_model = data.get("USER_INFO_EXTRACTION_MODEL")
    decision_model = data.get("DECISION_MODEL")
    document_analysis_model = data.get("DOCUMENT_ANALYSIS_MODEL")
    vision_default_model = data.get("VISION_MODEL")
    vision_fallback_models = data.get("VISION_FALLBACK_MODELS")
    timeout = data.get("timeout")
    message_limit = data.get("message_limit")
    message_offset = data.get("message_offset")
    manual_model_switch = data.get("manual_model_switch")
    summarization_prompt = data.get("summarization_prompt")

    settings.update_settings(
        ollama_url=ollama_url,
        ollama_model=ollama_model,
        chat_model=chat_model,
        fast_model=fast_model,
        summary_model=summary_model,
        user_info_extraction_model=user_info_extraction_model,
        decision_model=decision_model,
        document_analysis_model=document_analysis_model,
        vision_default_model=vision_default_model,
        vision_fallback_models=vision_fallback_models,
        timeout=timeout,
        message_limit=message_limit,
        message_offset=message_offset,
        manual_model_switch=manual_model_switch,
        summarization_prompt=summarization_prompt,
    )
    return {
        "OLLAMA_URL": settings.OLLAMA_URL,
        "OLLAMA_MODEL": settings.OLLAMA_MODEL,
        "CHAT_MODEL": settings.CHAT_MODEL,
        "FAST_MODEL": settings.FAST_MODEL,
        "SUMMARY_MODEL": settings.SUMMARY_MODEL,
        "USER_INFO_EXTRACTION_MODEL": settings.USER_INFO_EXTRACTION_MODEL,
        "DECISION_MODEL": settings.DECISION_MODEL,
        "DOCUMENT_ANALYSIS_MODEL": settings.DOCUMENT_ANALYSIS_MODEL,
        "VISION_MODEL": settings.VISION_MODEL,
        "VISION_FALLBACK_MODELS": settings.VISION_FALLBACK_MODELS,
        "timeout": settings.timeout,
        "message_limit": settings.message_limit,
        "message_offset": settings.message_offset,
        "manual_model_switch": settings.manual_model_switch,
        "auto_model_selection": getattr(settings, "auto_model_selection", False),
        "summarization_prompt": settings.summarization_prompt,
        "user_info_extraction_model": settings.USER_INFO_EXTRACTION_MODEL,
    }
