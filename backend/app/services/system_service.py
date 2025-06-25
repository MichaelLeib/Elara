import json
import platform
import psutil
from typing import List, Dict, Any
from app.models.schemas import SystemInfo, ModelInfo


class SystemService:
    """Service for system information and model recommendations"""
    
    def __init__(self):
        self.models_file = "storage/ai-models.json"
    
    def get_system_info(self) -> SystemInfo:
        """Get system hardware information for model recommendations"""
        try:
            cpu_count = psutil.cpu_count() or 4  # Default to 4 if None
            memory_gb = psutil.virtual_memory().total / (1024**3)
            platform_name = platform.system()
            
            return SystemInfo(
                cpu_count=cpu_count,
                memory_gb=round(memory_gb, 1),
                platform=platform_name,
                architecture=platform.machine()
            )
        except Exception as e:
            print(f"Error getting system info: {e}")
            return SystemInfo(
                cpu_count=4,
                memory_gb=8.0,
                platform="unknown",
                architecture="unknown"
            )
    
    def get_model_recommendations(self, system_info: SystemInfo) -> List[ModelInfo]:
        """Get model recommendations based on hardware"""
        try:
            with open(self.models_file, "r") as f:
                models_data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"Error loading models file: {e}")
            return []
        
        memory_gb = system_info.memory_gb
        
        # Filter and rank models based on hardware
        if memory_gb < 4:
            # Low memory systems
            recommended_names = ["llama3.2:1b", "tinyllama:1.1b"]
        elif memory_gb < 8:
            # Medium memory systems
            recommended_names = ["llama3.2:1b", "llama3.2:3b", "phi3:mini", "gemma:2b"]
        elif memory_gb < 16:
            # High memory systems
            recommended_names = [
                "llama3.2:3b", "llama3.2:8b", "llava:7b", "codellama:7b", 
                "mistral:7b", "gemma2:9b", "qwen2.5:7b", "qwen2.5-coder:3b"
            ]
        else:
            # Workstation systems
            recommended_names = [
                "llama3.2:8b", "llama3.2:70b", "llava:7b", "codellama:7b",
                "mistral:7b", "gemma2:9b", "qwen2.5:7b", "phi3:14b", 
                "deepseek-coder:6.7b", "qwen2.5-coder:3b"
            ]
        
        # Convert to ModelInfo objects
        models = []
        for model_data in models_data:
            model = ModelInfo(
                name=model_data["name"],
                description=model_data["description"],
                strengths=model_data["strengths"],
                weaknesses=model_data["weaknesses"],
                best_for=model_data["best_for"],
                recommended_for=model_data["recommended_for"],
                recommended=model_data["name"] in recommended_names,
                installed=False,  # Will be set by the calling service
                details=model_data.get("details")
            )
            models.append(model)
        
        return models


# Global service instance
system_service = SystemService() 