from fastapi import APIRouter, HTTPException
from app.models.schemas import ModelDownloadRequest, ModelsResponse, DiagnosticInfo
from app.services.ollama_service import ollama_service
from app.services.system_service import system_service
from app.config.settings import settings

router = APIRouter(prefix="/api", tags=["models"])


@router.get("/models/available")
async def get_available_ollama_models():
    """Get all available models from Ollama library with recommendations"""
    try:
        # Get system info for recommendations
        system_info = system_service.get_system_info()
        recommendations = system_service.get_model_recommendations(system_info)

        # Get currently installed models
        installed_models_data = await ollama_service.get_installed_models()

        # Create a set of installed model names
        installed_names = {model["name"] for model in installed_models_data}

        # Mark which models are installed in our recommendations
        for model in recommendations:
            model.installed = model.name in installed_names

        # Separate installed and available models from our recommendations
        installed_models_list = []
        available_models_list = []

        for model in recommendations:
            if model.installed:
                installed_models_list.append(model)
            else:
                available_models_list.append(model)

        # Add any installed models that are not in our recommendations
        for installed_model in installed_models_data:
            model_name = installed_model["name"]
            if not any(model.name == model_name for model in recommendations):
                # Create a basic model entry for installed models not in our list
                from app.models.schemas import ModelInfo

                basic_model = ModelInfo(
                    name=model_name,
                    description=f"Installed model: {model_name}",
                    strengths=["Already installed", "Ready to use"],
                    weaknesses=["Limited information available"],
                    best_for=["General use"],
                    recommended_for="Any hardware",
                    recommended=False,
                    installed=True,
                    details=installed_model.get("details", {}),
                )
                installed_models_list.append(basic_model)

        return ModelsResponse(
            installed_models=installed_models_list,
            available_models=available_models_list,
            system_info=system_info,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(e)}")


@router.post("/models/download")
async def download_model(request: ModelDownloadRequest):
    """Download a model to Ollama"""
    try:
        result = await ollama_service.download_model(request.model_name)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to download model: {str(e)}"
        )


@router.delete("/models/{model_name}")
async def remove_model(model_name: str):
    """Remove a model from Ollama"""
    try:
        result = await ollama_service.remove_model(model_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove model: {str(e)}")


@router.get("/models/download-status/{model_name}")
async def get_download_status(model_name: str):
    """Get download status for a model"""
    try:
        # This is a simplified implementation - in a real app you'd track download progress
        return {"status": "unknown", "progress": "unknown"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/models")
async def get_models():
    """Get list of available Ollama models"""
    try:
        models_data = await ollama_service.get_installed_models()
        return {"models": models_data}
    except Exception as e:
        error_detail = {
            "error": str(e),
            "type": type(e).__name__,
            "message": "Failed to fetch available models from Ollama",
        }
        raise HTTPException(status_code=500, detail=error_detail)


@router.get("/model-info/{model_name}")
async def get_model_info(model_name: str):
    """Get information about a specific Ollama model"""
    try:
        model_info = await ollama_service.get_model_info(model_name)
        return model_info
    except Exception as e:
        error_detail = {
            "error": str(e),
            "type": type(e).__name__,
            "message": "Failed to fetch model info from Ollama",
        }
        raise HTTPException(status_code=500, detail=error_detail)


@router.get("/running-models")
async def get_running_models():
    """Get list of running Ollama models"""
    try:
        running_models = await ollama_service.get_running_models()
        return {"models": running_models}
    except Exception as e:
        error_detail = {
            "error": str(e),
            "type": type(e).__name__,
            "message": "Failed to fetch running models from Ollama",
        }
        raise HTTPException(status_code=500, detail=error_detail)


@router.get("/diagnostic")
async def diagnostic():
    """Diagnostic information about Ollama connection and models"""
    try:
        # Get system info
        system_info = system_service.get_system_info()

        # Check Ollama connection
        connection_status = await ollama_service.check_connection()

        # Get running models
        try:
            running_models = await ollama_service.get_running_models()
            running_model_names = [model["name"] for model in running_models]
        except:
            running_model_names = []

        # Get available models
        try:
            installed_models = await ollama_service.get_installed_models()
            available_model_names = [model["name"] for model in installed_models]
        except:
            available_model_names = []

        return DiagnosticInfo(
            ollama_url=ollama_service.generate_url,
            default_model=settings.OLLAMA_MODEL,
            ollama_status=connection_status.get("status", "unknown"),
            available_models=available_model_names,
            running_models=running_model_names,
            errors=connection_status.get("error", []),
        )
    except Exception as e:
        return DiagnosticInfo(
            ollama_url="unknown",
            default_model="unknown",
            ollama_status="error",
            available_models=[],
            running_models=[],
            errors=[str(e)],
        )
