# AI Model Configuration Scan Results

## Executive Summary

This document presents the results of a comprehensive scan of the application for hardcoded AI model usage. All identified hardcoded models have been made configurable via `settings.json` to improve flexibility and maintainability.

## Hardcoded Models Found

### 1. Image Analysis Service (`backend/app/services/image_service.py`)

**Original Issues:**
- `DEFAULT_VISION_MODEL = "llava:7b"` - Hardcoded default vision model
- `FALLBACK_MODELS = ["phi3:mini", "llama3:latest", "dolphin-mistral:7b"]` - Hardcoded fallback models

**Configuration Added:**
- `vision.DEFAULT_MODEL` - Configurable default vision model
- `vision.FALLBACK_MODELS` - Configurable array of fallback models

### 2. Web Search Service (`backend/app/services/web_search_service.py`)

**Original Issues:**
- `model="phi3:mini"` - Hardcoded model for web search decision making

**Configuration Added:**
- `model.WEB_SEARCH_DECISION_MODEL` - Configurable model for quick web search decisions

### 3. User Information Extraction (`backend/app/services/user_info_extractor.py`)

**Original Issues:**
- `extraction_model = model or "tinyllama:1.1b"` - Hardcoded fallback model for user info extraction

**Configuration Added:**
- `model.USER_INFO_EXTRACTION_MODEL` - Configurable model for extracting user information

### 4. Summarization Service (`backend/app/services/summarization_service.py`)

**Original Issues:**
- Used generic `settings.OLLAMA_MODEL` instead of specialized summary model

**Configuration Added:**
- `model.SUMMARY_MODEL` - Dedicated configurable model for conversation summarization

### 5. Document Analysis Service (`backend/app/services/document_service.py`)

**Original Issues:**
- Used generic `settings.OLLAMA_MODEL` for document analysis
- Hardcoded model capabilities registry

**Configuration Added:**
- `model.DOCUMENT_ANALYSIS_MODEL` - Dedicated configurable model for document analysis

### 6. Chat Service (`backend/app/routes/chat.py`)

**Original Issues:**
- Used generic `settings.OLLAMA_MODEL` for all chat operations
- Hardcoded timeout logic based on model names

**Configuration Added:**
- `model.CHAT_MODEL` - Dedicated configurable model for chat interactions

### 7. Settings Configuration (`backend/app/config/settings.py`)

**Original Issues:**
- `self._ollama_model: str = "tinyllama:1.1b"` - Hardcoded fallback default

**Configuration Added:**
- All model types now have dedicated properties and fallback defaults

## New Configuration Structure

### Updated `settings.json` Structure:

```json
{
  "model": {
    "OLLAMA_URL": "http://localhost:11434/api/generate",
    "OLLAMA_MODEL": "phi3:mini",
    "CHAT_MODEL": "phi3:mini",
    "FAST_MODEL": "phi3:mini", 
    "SUMMARY_MODEL": "phi3:mini",
    "USER_INFO_EXTRACTION_MODEL": "tinyllama:1.1b",
    "WEB_SEARCH_DECISION_MODEL": "phi3:mini",
    "DOCUMENT_ANALYSIS_MODEL": "phi3:mini"
  },
  "vision": {
    "DEFAULT_MODEL": "llava:7b",
    "FALLBACK_MODELS": ["phi3:mini", "llama3:latest", "dolphin-mistral:7b"]
  }
}
```

### Model Type Categories:

1. **CHAT_MODEL** - For general chat conversations and user interactions
2. **FAST_MODEL** - For quick operations requiring minimal processing
3. **SUMMARY_MODEL** - For conversation summarization and insight extraction
4. **USER_INFO_EXTRACTION_MODEL** - For extracting and categorizing user information
5. **WEB_SEARCH_DECISION_MODEL** - For making quick decisions about web search necessity
6. **DOCUMENT_ANALYSIS_MODEL** - For analyzing uploaded documents
7. **VISION_DEFAULT_MODEL** - For image analysis and vision tasks
8. **VISION_FALLBACK_MODELS** - Array of fallback models when vision models are unavailable

## Code Changes Made

### 1. Settings.py Updates
- Added properties for all new model types
- Updated `_load_settings()` to read new configuration structure
- Enhanced `update_settings()` method to handle all model types
- Added proper type hints for List[str] for fallback models

### 2. Service Updates
- **ImageService**: Converted static constants to configurable methods
- **WebSearchService**: Updated to use `settings.WEB_SEARCH_DECISION_MODEL`
- **UserInfoExtractor**: Updated to use `settings.USER_INFO_EXTRACTION_MODEL`
- **SummarizationService**: Updated to use `settings.SUMMARY_MODEL`
- **DocumentService**: Updated to use `settings.DOCUMENT_ANALYSIS_MODEL`
- **ChatRoutes**: Updated to use `settings.CHAT_MODEL`

### 3. Dynamic Model Resolution
- Vision models now resolve dynamically from settings
- All hardcoded model references have been replaced with configurable alternatives
- Proper fallback mechanisms maintained for backwards compatibility

## Benefits of This Configuration

### 1. Flexibility
- Users can now configure different models for different tasks
- Easy to swap models based on performance requirements
- Support for specialized models for specific use cases

### 2. Performance Optimization
- Can use lightweight models for quick decisions (web search, user info extraction)
- Can use more powerful models for complex tasks (document analysis, chat)
- Vision models can be configured separately from text models

### 3. Resource Management
- Better control over which models are loaded for which tasks
- Ability to use smaller models for background tasks to save resources
- Configurable fallback strategies

### 4. Maintainability
- All model configurations centralized in one location
- Easy to update model versions without code changes
- Clear separation of concerns between different AI tasks

## Recommended Model Configurations

### For Development/Testing:
```json
{
  "model": {
    "CHAT_MODEL": "phi3:mini",
    "FAST_MODEL": "tinyllama:1.1b",
    "SUMMARY_MODEL": "phi3:mini",
    "USER_INFO_EXTRACTION_MODEL": "tinyllama:1.1b",
    "WEB_SEARCH_DECISION_MODEL": "tinyllama:1.1b",
    "DOCUMENT_ANALYSIS_MODEL": "phi3:mini"
  },
  "vision": {
    "DEFAULT_MODEL": "llava:7b",
    "FALLBACK_MODELS": ["phi3:mini"]
  }
}
```

### For Production (High Performance):
```json
{
  "model": {
    "CHAT_MODEL": "llama3.1:8b",
    "FAST_MODEL": "phi3:mini",
    "SUMMARY_MODEL": "llama3.1:8b", 
    "USER_INFO_EXTRACTION_MODEL": "phi3:mini",
    "WEB_SEARCH_DECISION_MODEL": "phi3:mini",
    "DOCUMENT_ANALYSIS_MODEL": "llama3.1:8b"
  },
  "vision": {
    "DEFAULT_MODEL": "llava:13b",
    "FALLBACK_MODELS": ["llava:7b", "phi3:mini"]
  }
}
```

### For Resource-Constrained Environments:
```json
{
  "model": {
    "CHAT_MODEL": "tinyllama:1.1b",
    "FAST_MODEL": "tinyllama:1.1b",
    "SUMMARY_MODEL": "phi3:mini",
    "USER_INFO_EXTRACTION_MODEL": "tinyllama:1.1b", 
    "WEB_SEARCH_DECISION_MODEL": "tinyllama:1.1b",
    "DOCUMENT_ANALYSIS_MODEL": "phi3:mini"
  },
  "vision": {
    "DEFAULT_MODEL": "llava:7b",
    "FALLBACK_MODELS": ["phi3:mini"]
  }
}
```

## Testing Recommendations

1. **Verify Configuration Loading**: Ensure all new settings are properly loaded on startup
2. **Test Model Switching**: Verify that changing models in settings.json takes effect
3. **Fallback Testing**: Test vision model fallback when primary models are unavailable
4. **Performance Testing**: Compare performance with different model configurations
5. **Error Handling**: Ensure graceful handling when configured models are not available

## Future Enhancements

1. **Runtime Model Switching**: Add API endpoints to change models without restart
2. **Model Performance Monitoring**: Track performance metrics per model type
3. **Automatic Model Selection**: Use model registry to automatically select optimal models
4. **Model Health Checks**: Verify model availability before making requests
5. **Load Balancing**: Support multiple instances of the same model type for load distribution

## Conclusion

This comprehensive configuration system eliminates all hardcoded AI model usage throughout the application. Users now have full control over which models are used for each type of AI task, enabling optimization for their specific use cases, hardware constraints, and performance requirements.

All changes are backwards compatible and include proper fallback mechanisms to ensure the application continues to function even with incomplete configurations.