import httpx
import json
import asyncio
from typing import AsyncGenerator, List, Dict, Any, Optional
from app.config.settings import settings


class OllamaService:
    """Service for interacting with Ollama API"""

    def __init__(self):
        self.base_url = "http://localhost:11434"
        self.generate_url = f"{self.base_url}/api/generate"

    async def query_ollama(
        self, prompt: str, timeout: float, model: Optional[str] = None
    ) -> str:
        """Query Ollama with a single request"""
        if model is None:
            model = settings.OLLAMA_MODEL
        print(
            f"[OllamaService] Sending request: model={model}, timeout={timeout}, prompt_len={len(prompt)}"
        )
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    self.generate_url,
                    json={"model": model, "prompt": prompt, "stream": False},
                )
                response.raise_for_status()
                print(
                    f"[OllamaService] Response received: status={response.status_code}, response_len={len(str(response.text))}"
                )
                return response.json()["response"]
        except httpx.ConnectError as e:
            print(f"[OllamaService] Connection error: {e}")
            raise Exception(
                f"Could not connect to Ollama at {self.generate_url}. Make sure Ollama is running: {str(e)}"
            )
        except httpx.TimeoutException as e:
            print(f"[OllamaService] Timeout error: {e}")
            raise Exception(
                f"Request to Ollama timed out. The model '{model}' might be too slow or not responding: {str(e)}"
            )
        except httpx.HTTPStatusError as e:
            print(
                f"[OllamaService] HTTP error: {e.response.status_code} {e.response.text}"
            )
            if e.response.status_code == 404:
                available_models = await self.get_available_models()
                raise Exception(
                    f"Model '{model}' not found. Available models: {available_models}"
                )
            elif e.response.status_code == 500:
                raise Exception(f"Ollama server error: {e.response.text}")
            else:
                raise Exception(
                    f"HTTP error {e.response.status_code}: {e.response.text}"
                )
        except Exception as e:
            print(f"[OllamaService] Unexpected error: {e}")
            raise Exception(f"Unexpected error querying Ollama: {str(e)}")

    async def query_ollama_stream(
        self, prompt: str, timeout: float, model: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Query Ollama with streaming enabled"""
        if model is None:
            model = settings.OLLAMA_MODEL
        print(
            f"[OllamaService] Sending streaming request: model={model}, timeout={timeout}, prompt_len={len(prompt)}"
        )
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream(
                    "POST",
                    self.generate_url,
                    json={"model": model, "prompt": prompt, "stream": True},
                ) as response:
                    response.raise_for_status()
                    print(
                        f"[OllamaService] Streaming response started: status={response.status_code}"
                    )
                    async for line in response.aiter_lines():
                        if line.strip():
                            try:
                                data = json.loads(line)
                                if "response" in data:
                                    yield data["response"]
                                if data.get("done", False):
                                    break
                            except json.JSONDecodeError:
                                continue

        except httpx.ConnectError as e:
            print(f"[OllamaService] Connection error: {e}")
            raise Exception(
                f"Could not connect to Ollama at {self.generate_url}. Make sure Ollama is running: {str(e)}"
            )
        except httpx.TimeoutException as e:
            print(f"[OllamaService] Timeout error: {e}")
            raise Exception(
                f"Request to Ollama timed out. The model '{model}' might be too slow or not responding: {str(e)}"
            )
        except httpx.HTTPStatusError as e:
            print(
                f"[OllamaService] HTTP error: {e.response.status_code} {e.response.text}"
            )
            if e.response.status_code == 404:
                available_models = await self.get_available_models()
                raise Exception(
                    f"Model '{model}' not found. Available models: {available_models}"
                )
            elif e.response.status_code == 500:
                raise Exception(f"Ollama server error: {e.response.text}")
            else:
                raise Exception(
                    f"HTTP error {e.response.status_code}: {e.response.text}"
                )
        except Exception as e:
            print(f"[OllamaService] Unexpected error: {e}")
            raise Exception(f"Unexpected error querying Ollama: {str(e)}")

    async def get_available_models(self) -> str:
        """Get list of available models for error messages"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code == 200:
                    models_data = response.json()
                    if "models" in models_data:
                        return ", ".join(
                            [model["name"] for model in models_data["models"]]
                        )
                    return "No models found"
                return "Could not fetch models"
        except:
            return "Could not fetch models"

    async def get_installed_models(self) -> List[Dict[str, Any]]:
        """Get list of installed models from Ollama"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                models_data = response.json()
                return models_data.get("models", [])
        except Exception as e:
            raise Exception(f"Failed to fetch installed models: {str(e)}")

    async def download_model(self, model_name: str) -> Dict[str, str]:
        """Download a model to Ollama"""
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:  # 5 minute timeout
                response = await client.post(
                    f"{self.base_url}/api/pull", json={"name": model_name}
                )
                response.raise_for_status()
                return {
                    "status": "success",
                    "message": f"Model {model_name} downloaded successfully",
                }
        except Exception as e:
            raise Exception(f"Failed to download model: {str(e)}")

    async def remove_model(self, model_name: str) -> Dict[str, str]:
        """Remove a model from Ollama"""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.delete(
                    f"{self.base_url}/api/delete", params={"name": model_name}
                )
                response.raise_for_status()
                return {
                    "status": "success",
                    "message": f"Model {model_name} removed successfully",
                }
        except Exception as e:
            raise Exception(f"Failed to remove model: {str(e)}")

    async def get_model_info(self, model_name: str) -> Dict[str, Any]:
        """Get information about a specific model"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/show", json={"name": model_name}
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            raise Exception(f"Failed to fetch model info: {str(e)}")

    async def get_running_models(self) -> List[Dict[str, Any]]:
        """Get list of running models"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/ps")
                response.raise_for_status()
                ps_data = response.json()
                return ps_data.get("models", [])
        except Exception as e:
            raise Exception(f"Failed to fetch running models: {str(e)}")

    async def check_connection(self) -> Dict[str, Any]:
        """Check Ollama connection and return status"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code == 200:
                    return {
                        "status": "connected",
                        "models": response.json().get("models", []),
                    }
                else:
                    return {
                        "status": f"error_{response.status_code}",
                        "error": response.text,
                    }
        except Exception as e:
            return {"status": "disconnected", "error": str(e)}


# Global service instance
ollama_service = OllamaService()
