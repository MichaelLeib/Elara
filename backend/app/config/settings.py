import json
import os
from typing import Optional, List

from docx import document


class Settings:
    """Application settings management"""

    def __init__(self):
        self._ollama_url: str = "http://localhost:11434/api/generate"
        self._ollama_model: str = "tinyllama:1.1b"
        self._chat_model: str = "phi3:mini"
        self._fast_model: str = "phi3:mini"
        self._summary_model: str = "phi3:mini"
        self._user_info_extraction_model: str = "tinyllama:1.1b"
        self._web_search_decision_model: str = "phi3:mini"
        self._document_analysis_model: str = "phi3:mini"
        self._vision_default_model: str = "llava:7b"
        self._vision_fallback_models: List[str] = ["phi3:mini", "llama3:latest", "dolphin-mistral:7b"]
        self._timeout: float = 30.0
        self._message_limit: int = 5
        self._message_offset: int = 0
        self._manual_model_switch: bool = False
        self._summarization_prompt: str = ""
        self._serper_api_key: Optional[str] = None
        self._web_search_enabled: bool = True
        self._web_search_engine: str = "duckduckgo"
        self._web_search_search_provider: str = "serper"
        self._load_settings()

    def _load_settings(self):
        """Load settings from JSON file with fallback to defaults"""
        try:
            with open("storage/settings.json", "r") as f:
                settings = json.load(f)
            
            # Load model settings
            model_settings = settings.get("model", {})
            self._ollama_url = model_settings.get("OLLAMA_URL", self._ollama_url)
            self._ollama_model = model_settings.get("OLLAMA_MODEL", self._ollama_model)
            self._chat_model = model_settings.get("CHAT_MODEL", self._chat_model)
            self._fast_model = model_settings.get("FAST_MODEL", self._fast_model)
            self._summary_model = model_settings.get("SUMMARY_MODEL", self._summary_model)
            self._user_info_extraction_model = model_settings.get("USER_INFO_EXTRACTION_MODEL", self._user_info_extraction_model)
            self._web_search_decision_model = model_settings.get("WEB_SEARCH_DECISION_MODEL", self._web_search_decision_model)
            self._document_analysis_model = model_settings.get("DOCUMENT_ANALYSIS_MODEL", self._document_analysis_model)
            
            # Load vision settings
            vision_settings = settings.get("vision", {})
            self._vision_default_model = vision_settings.get("DEFAULT_MODEL", self._vision_default_model)
            self._vision_fallback_models = vision_settings.get("FALLBACK_MODELS", self._vision_fallback_models)
            
            # Load other settings
            document_settings = settings.get("document", {})
            self._chunk_size = document_settings.get("CHUNK_SIZE")
            self._chunk_overlap = document_settings.get("CHUNK_OVERLAP")
            self._chunk_prompt = document_settings.get("CHUNK_PROMPT")
            self._document_timeout = document_settings.get("TIMEOUT")
            chat_settings = settings.get("chat", {})
            self._message_limit = chat_settings.get("MESSAGE_LIMIT")
            self._message_offset = chat_settings.get("MESSAGE_OFFSET")
            self._manual_model_switch = settings.get("manual_model_switch", False)
            self._summarization_prompt = settings.get("summarization_prompt", "")
            self._chat_timeout = chat_settings.get("MESSAGE_TIMEOUT")
            image_settings = settings.get("image", {})
            self._image_timeout = image_settings.get("IMAGE_TIMEOUT")
            self._image_prompt = image_settings.get("IMAGE_PROMPT")
            web_search_settings = settings.get("web_search", {})
            self._serper_api_key = web_search_settings.get("SERPER_API_KEY")
            self._web_search_enabled = web_search_settings.get("ENABLED", True)
            self._web_search_engine = web_search_settings.get("ENGINE", "duckduckgo")
            self._web_search_search_provider = web_search_settings.get(
                "SEARCH_PROVIDER", "serper"
            )
        except (FileNotFoundError, KeyError, json.JSONDecodeError) as e:
            print(f"Warning: Could not load settings.json: {e}")
            print("Using default settings...")

    @property
    def OLLAMA_URL(self) -> str:
        return self._ollama_url

    @property
    def OLLAMA_MODEL(self) -> str:
        return self._ollama_model

    @property
    def CHAT_MODEL(self) -> str:
        return self._chat_model

    @property
    def FAST_MODEL(self) -> str:
        return self._fast_model

    @property
    def SUMMARY_MODEL(self) -> str:
        return self._summary_model

    @property
    def USER_INFO_EXTRACTION_MODEL(self) -> str:
        return self._user_info_extraction_model

    @property
    def WEB_SEARCH_DECISION_MODEL(self) -> str:
        return self._web_search_decision_model

    @property
    def DOCUMENT_ANALYSIS_MODEL(self) -> str:
        return self._document_analysis_model

    @property
    def VISION_DEFAULT_MODEL(self) -> str:
        return self._vision_default_model

    @property
    def VISION_FALLBACK_MODELS(self) -> List[str]:
        return self._vision_fallback_models

    @property
    def timeout(self) -> float:
        return self._timeout

    @property
    def document_timeout(self) -> float:
        return getattr(self, "_document_timeout", 600.0) or 600.0

    @property
    def image_timeout(self) -> float:
        return getattr(self, "_image_timeout", 120.0) or 120.0

    @property
    def message_limit(self) -> int:
        return self._message_limit

    @property
    def message_offset(self) -> int:
        return self._message_offset

    @property
    def manual_model_switch(self) -> bool:
        return self._manual_model_switch

    @property
    def summarization_prompt(self) -> str:
        return self._summarization_prompt

    @property
    def SERPER_API_KEY(self) -> Optional[str]:
        return self._serper_api_key

    @property
    def web_search_enabled(self) -> bool:
        return self._web_search_enabled

    @property
    def web_search_engine(self) -> str:
        return self._web_search_engine

    @property
    def web_search_search_provider(self) -> str:
        return self._web_search_search_provider

    def update_settings(
        self,
        ollama_url: Optional[str] = None,
        ollama_model: Optional[str] = None,
        chat_model: Optional[str] = None,
        fast_model: Optional[str] = None,
        summary_model: Optional[str] = None,
        user_info_extraction_model: Optional[str] = None,
        web_search_decision_model: Optional[str] = None,
        document_analysis_model: Optional[str] = None,
        vision_default_model: Optional[str] = None,
        vision_fallback_models: Optional[List[str]] = None,
        timeout: Optional[float] = None,
        message_limit: Optional[int] = None,
        message_offset: Optional[int] = None,
        manual_model_switch: Optional[bool] = None,
        summarization_prompt: Optional[str] = None,
    ):
        """Update settings and save to file"""
        if ollama_url:
            self._ollama_url = ollama_url
        if ollama_model:
            self._ollama_model = ollama_model
        if chat_model:
            self._chat_model = chat_model
        if fast_model:
            self._fast_model = fast_model
        if summary_model:
            self._summary_model = summary_model
        if user_info_extraction_model:
            self._user_info_extraction_model = user_info_extraction_model
        if web_search_decision_model:
            self._web_search_decision_model = web_search_decision_model
        if document_analysis_model:
            self._document_analysis_model = document_analysis_model
        if vision_default_model:
            self._vision_default_model = vision_default_model
        if vision_fallback_models:
            self._vision_fallback_models = vision_fallback_models
        if timeout is not None:
            self._timeout = timeout
        if message_limit is not None:
            self._message_limit = message_limit
        if message_offset is not None:
            self._message_offset = message_offset
        if manual_model_switch is not None:
            self._manual_model_switch = manual_model_switch
        if summarization_prompt is not None:
            self._summarization_prompt = summarization_prompt

        # Save updated settings
        try:
            settings_data = {
                "model": {
                    "OLLAMA_URL": self._ollama_url,
                    "OLLAMA_MODEL": self._ollama_model,
                    "CHAT_MODEL": self._chat_model,
                    "FAST_MODEL": self._fast_model,
                    "SUMMARY_MODEL": self._summary_model,
                    "USER_INFO_EXTRACTION_MODEL": self._user_info_extraction_model,
                    "WEB_SEARCH_DECISION_MODEL": self._web_search_decision_model,
                    "DOCUMENT_ANALYSIS_MODEL": self._document_analysis_model,
                },
                "vision": {
                    "DEFAULT_MODEL": self._vision_default_model,
                    "FALLBACK_MODELS": self._vision_fallback_models,
                },
                "timeout": self._timeout,
                "chat": {
                    "MESSAGE_LIMIT": self._message_limit,
                    "MESSAGE_OFFSET": self._message_offset,
                },
                "manual_model_switch": self._manual_model_switch,
                "summarization_prompt": self._summarization_prompt,
            }
            with open("storage/settings.json", "w") as f:
                json.dump(settings_data, f, indent=2)
        except Exception as e:
            print(f"Error saving settings: {e}")


# Global settings instance
settings = Settings()
