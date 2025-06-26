import json
import os
from typing import Optional


class Settings:
    """Application settings management"""

    def __init__(self):
        self._ollama_url: str = "http://localhost:11434/api/generate"
        self._ollama_model: str = "tinyllama:1.1b"
        self._timeout: float = 30.0
        self._message_limit: int = 5
        self._message_offset: int = 0
        self._load_settings()

    def _load_settings(self):
        """Load settings from JSON file with fallback to defaults"""
        try:
            with open("storage/settings.json", "r") as f:
                settings = json.load(f)
            self._ollama_url = settings["model"]["OLLAMA_URL"]
            self._ollama_model = settings["model"]["OLLAMA_MODEL"]
            self._timeout = settings.get("timeout")
            chat_settings = settings.get("chat", {})
            self._message_limit = chat_settings.get("MESSAGE_LIMIT")
            self._message_offset = chat_settings.get("MESSAGE_OFFSET")
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
    def timeout(self) -> float:
        return self._timeout

    @property
    def message_limit(self) -> int:
        return self._message_limit

    @property
    def message_offset(self) -> int:
        return self._message_offset

    def update_settings(
        self,
        ollama_url: Optional[str] = None,
        ollama_model: Optional[str] = None,
        timeout: Optional[float] = None,
        message_limit: Optional[int] = None,
        message_offset: Optional[int] = None,
    ):
        """Update settings and save to file"""
        if ollama_url:
            self._ollama_url = ollama_url
        if ollama_model:
            self._ollama_model = ollama_model
        if timeout is not None:
            self._timeout = timeout
        if message_limit is not None:
            self._message_limit = message_limit
        if message_offset is not None:
            self._message_offset = message_offset

        # Save updated settings
        try:
            settings_data = {
                "model": {
                    "OLLAMA_URL": self._ollama_url,
                    "OLLAMA_MODEL": self._ollama_model,
                },
                "timeout": self._timeout,
                "chat": {
                    "MESSAGE_LIMIT": self._message_limit,
                    "MESSAGE_OFFSET": self._message_offset,
                },
            }
            with open("storage/settings.json", "w") as f:
                json.dump(settings_data, f, indent=2)
        except Exception as e:
            print(f"Error saving settings: {e}")


# Global settings instance
settings = Settings()
