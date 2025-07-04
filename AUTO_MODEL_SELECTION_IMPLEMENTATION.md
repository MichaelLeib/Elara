# Auto Model Selection Implementation

## Overview
This document summarizes the implementation of the auto model selection feature, which allows users to enable automatic model selection in the settings dialog and hides the model picker in the message input when enabled.

## Changes Made

### 1. Settings Store Updates
**File: `frontend/src/store/settingsStore.ts`**
- Added `auto_model_selection: boolean` field to the `Settings` interface
- This setting controls whether the AI should automatically choose the best model

### 2. API Models Updates  
**File: `frontend/src/api/models.ts`**
- Added `auto_model_selection: boolean` field to the `Settings` interface to keep API types in sync

### 3. Settings Dialog Enhancement
**File: `frontend/src/components/Settings/SettingsDialog.tsx`**
- Added import for `useSettingsStore`
- Added settings loading in `useEffect` 
- Added new "Model Selection" accordion section with:
  - Checkbox to toggle auto model selection
  - Description text showing current mode

### 4. Models Store Fix
**File: `frontend/src/store/modelsStore.ts`**
- Changed `description` field from optional to required in `Model` interface
- Added fallback description generation in `reloadModels()` to ensure all models have descriptions
- This fixes the "model list" issue where descriptions were undefined

### 5. MessageInput Component Updates
**File: `frontend/src/components/Chat/Chat/MessageInput.tsx`**
- Added import for `useSettingsStore`
- Added settings usage to check `auto_model_selection` flag
- Conditionally rendered model selector - hidden when auto mode is enabled
- Updated `handleSend()` to use "auto" model when auto mode is enabled
- Updated `isSendDisabled` logic to account for auto mode

### 6. App Component Updates
**File: `frontend/src/App.tsx`**
- Added `useModelsStore` import and usage
- Added `reloadSettings()` call on app startup
- Added `reloadModels()` call on app startup
- Ensures settings and models are loaded when the app initializes

## Feature Behavior

### When Auto Model Selection is Disabled (Default)
- Settings dialog shows "Manual model selection in chat"
- MessageInput displays the model picker dropdown
- User can manually select which model to use for each message
- Send button is disabled if no model is selected

### When Auto Model Selection is Enabled
- Settings dialog shows "AI will automatically choose the best model"
- MessageInput hides the model picker dropdown completely
- Backend automatically selects the best model for each message
- Send button works without requiring model selection

## Technical Details

### Model List Fix
The original issue with the model list was that models fetched from the API sometimes lacked descriptions, causing `undefined` to be displayed in the UI. This was fixed by:
1. Making the `description` field required in the `Model` interface
2. Adding a fallback in `reloadModels()` that generates descriptions like "AI Model: {modelName}" for models without descriptions

### Auto Model Selection Logic
When auto mode is enabled:
- The `handleSend()` function passes "auto" as the model parameter
- The backend receives this and determines the best model based on the message content
- No model validation is performed on the frontend side

### Settings Persistence
- Settings are automatically saved when the checkbox is toggled
- Settings are loaded on app startup via the new `useEffect` in App.tsx
- The setting persists between app sessions

## Files Modified
1. `frontend/src/store/settingsStore.ts` - Added auto_model_selection field
2. `frontend/src/api/models.ts` - Added auto_model_selection field
3. `frontend/src/components/Settings/SettingsDialog.tsx` - Added UI for the setting
4. `frontend/src/store/modelsStore.ts` - Fixed model descriptions
5. `frontend/src/components/Chat/Chat/MessageInput.tsx` - Hide model picker when auto mode
6. `frontend/src/App.tsx` - Load settings and models on startup

## Testing
The implementation includes proper TypeScript types and error handling. A pre-existing TypeScript error in `useChatSessionMessages.tsx` was discovered but is unrelated to this implementation.