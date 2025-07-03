// Zustand Store Usage Examples
// This file shows how to use the Zustand stores that have replaced the React Context providers

// Import examples (uncomment to use):
// import {
//   useModelsStore,
//   useSettingsStore,
//   useChatStore,
//   useUIStore,
//   useSettingsDialogStore,
//   useFileHandlingStore,
// } from "../store";

// ===== MODELS STORE =====
// To get models:
// const { models, loading, error, reloadModels } = useModelsStore();

// To reload models:
// useModelsStore.getState().reloadModels();

// ===== SETTINGS STORE =====
// To get settings:
// const { settings, loading, error, reloadSettings, saveSettings } = useSettingsStore();

// To reload settings:
// useSettingsStore.getState().reloadSettings();

// To save settings:
// useSettingsStore.getState().saveSettings({ timeout: 30 });

// ===== CHAT STORE =====
// To get chat state:
// const {
//   messages,
//   selectedSessionId,
//   chatSessions,
//   isMessageLoading,
//   addMessage,
//   updateMessage,
//   handleSendMessage
// } = useChatStore();

// To send a message:
// useChatStore.getState().handleSendMessage("Hello", "llama3.2", []);

// ===== UI STORE =====
// To set progress:
// useUIStore.getState().setProgress(15, "Image-based PDF detected...");

// To clear progress:
// useUIStore.getState().setProgress(null, null);

// To set/clear PDF choice:
// useUIStore.getState().setPdfChoiceId("message-id");
// useUIStore.getState().setPdfChoiceId(null);

// To set streaming state:
// useUIStore.getState().setIsStreaming(true);

// ===== SETTINGS DIALOG STORE =====
// To get settings dialog state:
// const {
//   memoryEntries,
//   availableModels,
//   systemInfo,
//   addMemoryEntry,
//   downloadModelHandler
// } = useSettingsDialogStore();

// To load data:
// useSettingsDialogStore.getState().loadData();

// ===== FILE HANDLING STORE =====
// To get file handling state:
// const {
//   attachments,
//   imageUrls,
//   isDragOver,
//   addAttachments,
//   removeAttachment
// } = useFileHandlingStore();

// To add files:
// useFileHandlingStore.getState().addAttachments([file1, file2]);

// To clear attachments:
// useFileHandlingStore.getState().clearAttachments();
