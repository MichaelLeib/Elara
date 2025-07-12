# Model Configuration Feature Implementation

## Overview

Added a new "Model Configuration" section to the Settings Dialog that allows users to configure which Ollama models are used for different purposes within the application.

## Features Implemented

### Frontend Changes

1. **Updated Settings Interface** (`frontend/src/store/settingsStore.ts` & `frontend/src/api/models.ts`)

   - Added all model configuration fields:
     - `CHAT_MODEL` - Main model for general conversation
     - `FAST_MODEL` - Lightweight model for quick responses
     - `SUMMARY_MODEL` - Model for text summarization
     - `USER_INFO_EXTRACTION_MODEL` - Model for extracting user information
     - `DECISION_MODEL` - Model for decisions to do web search, image creation/analysis, document creation/analysis etc...
     - `DOCUMENT_ANALYSIS_MODEL` - Model for document analysis
     - `VISION_DEFAULT_MODEL` - Model for image analysis
     - `VISION_FALLBACK_MODELS` - Array of fallback vision models

2. **New API Function** (`frontend/src/api/chatApi.ts`)

   - Added `getInstalledModels()` function to retrieve only installed Ollama models

3. **Enhanced Settings Dialog Store** (`frontend/src/store/settingsDialogStore.ts`)

   - Added `installedModels` state to track installed models
   - Added `loadInstalledModels()` function
   - Integrated installed models loading into the main `loadData()` function

4. **Model Configuration UI** (`frontend/src/components/Settings/SettingsDialog.tsx`)
   - Added new "Model Configuration" accordion section
   - Created nested accordion panels for each model type:
     - Chat Model
     - Fast Model
     - Summary Model
     - User Info Extraction Model
     - Web Search Decision Model
     - Document Analysis Model
     - Vision Model
   - Each panel includes:
     - Description of the model's purpose
     - Dropdown to select from installed Ollama models
     - Fallback message when no models are installed

### Backend Changes

1. **Updated Settings API** (`backend/app/routes/system.py`)
   - Enhanced `GET /api/settings` endpoint to return all model configuration fields
   - Updated `POST /api/settings` endpoint to accept and save model configuration updates
   - Added support for all model types defined in the Settings class

## How It Works

1. **Installation Check**: The system automatically detects which models are installed via Ollama
2. **Model Selection**: Users can select specific models for each purpose from dropdown menus
3. **Settings Persistence**: Model configurations are saved to `settings.json` in the backend storage
4. **Real-time Updates**: Changes are immediately reflected in the application settings

## Settings Structure

The model configurations are saved in `settings.json` under the following structure:

```json
{
  "model": {
    "CHAT_MODEL": "selected_model_name",
    "FAST_MODEL": "selected_model_name",
    "SUMMARY_MODEL": "selected_model_name",
    "USER_INFO_EXTRACTION_MODEL": "selected_model_name",
    "DECISION_MODEL": "selected_model_name",
    "DOCUMENT_ANALYSIS_MODEL": "selected_model_name"
  },
  "vision": {
    "DEFAULT_MODEL": "selected_vision_model",
    "FALLBACK_MODELS": ["model1", "model2"]
  }
}
```

## User Experience

1. Open Settings Dialog
2. Navigate to "Model Configuration" section
3. Expand individual model type accordions
4. Select desired models from dropdowns populated with installed Ollama models
5. Changes are automatically saved to settings.json
6. Models are immediately available for use in their respective contexts

## Benefits

- **Flexibility**: Users can optimize model selection based on their hardware and use cases
- **Performance**: Ability to use faster models for simple tasks and more capable models for complex tasks
- **Resource Management**: Better control over system resources by choosing appropriate model sizes
- **User Control**: Complete user control over which models are used for different purposes

## Dependencies

- Requires Ollama to be running with models installed
- Models must be compatible with the application's use cases
- Backend Settings class must support the model configuration fields
