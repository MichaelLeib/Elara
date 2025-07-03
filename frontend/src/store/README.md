# Zustand Store Migration

This directory contains the Zustand stores that have replaced the React Context providers for state management in the Elara frontend.

## Overview

The frontend has been migrated from React Context + useState to Zustand for better performance, simpler state management, and easier testing. The migration includes:

- **Models Store**: Manages AI model loading and selection
- **Settings Store**: Handles application settings and configuration
- **Chat Store**: Manages chat sessions, messages, and message sending
- **UI Store**: Handles UI state like progress, streaming, and notifications
- **Settings Dialog Store**: Manages the settings dialog state
- **File Handling Store**: Handles file attachments and drag/drop

## Store Structure

### 1. Models Store (`modelsStore.ts`)

```typescript
interface ModelsState {
  models: Model[];
  loading: boolean;
  error: string | null;
  reloadModels: () => Promise<void>;
}
```

**Usage:**

```typescript
import { useModelsStore } from "../store";

// In a component
const { models, loading, error, reloadModels } = useModelsStore();

// Direct access
useModelsStore.getState().reloadModels();
```

### 2. Settings Store (`settingsStore.ts`)

```typescript
interface SettingsState {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  reloadSettings: () => Promise<void>;
  saveSettings: (updates: Partial<Settings>) => Promise<void>;
}
```

**Usage:**

```typescript
import { useSettingsStore } from "../store";

const { settings, loading, error, reloadSettings, saveSettings } =
  useSettingsStore();
```

### 3. Chat Store (`chatStore.ts`)

```typescript
interface ChatState {
  // Chat sessions
  selectedSessionId: string | null;
  chatSessions: ChatSession[];
  showConfirmDialog: boolean;
  chatToDelete: string | null;

  // Messages
  messages: Message[];
  isLoadingMessages: boolean;
  hasMore: boolean;
  total: number;

  // Message sending
  isMessageLoading: boolean;
  currentAssistantMessageId: string | null;

  // Actions
  setSelectedSessionId: (id: string | null) => void;
  handleSelectChat: (sessionId: string) => void;
  handleNewChat: () => Promise<void>;
  handleNewPrivateChat: () => Promise<void>;
  handleDeleteChat: (sessionId: string) => void;
  handleDeleteConfirm: () => Promise<void>;
  setShowConfirmDialog: (show: boolean) => void;
  setChatToDelete: (id: string | null) => void;

  // Message actions
  loadMessages: (
    sessionId: string,
    settings: { message_limit: number; message_offset: number },
    limit?: number,
    offset?: number
  ) => Promise<void>;
  loadMore: (
    sessionId: string,
    settings: { message_limit: number; message_offset: number },
    limit?: number
  ) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessage: (
    messageId: string,
    updates:
      | Partial<Message>
      | ((prevMsg: Message | undefined) => Partial<Message>)
  ) => void;
  clearMessages: () => void;
  handleSendMessage: (
    message: string,
    model: string,
    attachments?: File[]
  ) => Promise<void>;

  // Initialize
  initialize: () => Promise<void>;
}
```

**Usage:**

```typescript
import { useChatStore } from "../store";

const {
  messages,
  selectedSessionId,
  chatSessions,
  isMessageLoading,
  handleSendMessage,
  handleNewChat,
} = useChatStore();
```

### 4. UI Store (`uiStore.ts`)

```typescript
interface UIState {
  // Progress and streaming
  progress: number | null;
  progressText: string;
  isStreaming: boolean;
  isStopping: boolean;

  // PDF choice
  pdfChoiceId: string | null;

  // Memory notification
  memoryNotification: MemoryNotification;

  // Web search
  webSearchStatus: WebSearchStatus;

  // Actions
  setProgress: (progress: number | null, text?: string) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setIsStopping: (isStopping: boolean) => void;
  setPdfChoiceId: (id: string | null) => void;
  setMemoryNotification: (notification: MemoryNotification) => void;
  setWebSearchStatus: (status: WebSearchStatus) => void;

  // Event handlers
  handleProgressUpdate: (event: CustomEvent) => void;
  handleStreamingUpdate: (event: CustomEvent) => void;
}
```

**Usage:**

```typescript
import { useUIStore } from "../store";

const { progress, isStreaming, setProgress, setIsStreaming } = useUIStore();

// Set progress
useUIStore.getState().setProgress(15, "Processing...");

// Clear progress
useUIStore.getState().setProgress(null, null);
```

### 5. Settings Dialog Store (`settingsDialogStore.ts`)

```typescript
interface SettingsDialogState {
  // Memory state
  memoryEntries: MemoryEntry[];
  isMemoryLoading: boolean;
  memoryError: string | null;

  // Models state
  availableModels: AvailableModel[];
  isModelsLoading: boolean;
  modelsError: string | null;
  downloadingModels: Set<string>;
  removingModels: Set<string>;

  // System info state
  systemInfo: SystemInfo | null;
  isSystemInfoLoading: boolean;
  systemInfoError: string | null;

  // Actions
  addMemoryEntry: () => void;
  updateMemoryEntry: (
    index: number,
    field: "key" | "value" | "importance",
    value: string
  ) => void;
  removeMemoryEntry: (index: number) => void;
  saveMemoryEntries: () => Promise<void>;
  downloadModelHandler: (modelName: string) => Promise<void>;
  removeModelHandler: (modelName: string) => Promise<void>;
  loadData: () => Promise<void>;
}
```

**Usage:**

```typescript
import { useSettingsDialogStore } from "../store";

const {
  memoryEntries,
  availableModels,
  addMemoryEntry,
  downloadModelHandler,
  loadData,
} = useSettingsDialogStore();
```

### 6. File Handling Store (`fileHandlingStore.ts`)

```typescript
interface FileHandlingState {
  attachments: File[];
  loadingImages: Set<string>;
  imageUrls: Map<string, string>;
  isDragOver: boolean;
  dragCounter: number;

  // Actions
  addAttachments: (files: File[]) => void;
  removeAttachment: (index: number) => void;
  clearAttachments: () => void;
  setLoadingImage: (filename: string, loading: boolean) => void;
  setImageUrl: (filename: string, url: string) => void;
  setIsDragOver: (isDragOver: boolean) => void;
  incrementDragCounter: () => void;
  decrementDragCounter: () => void;
}
```

**Usage:**

```typescript
import { useFileHandlingStore } from "../store";

const {
  attachments,
  imageUrls,
  isDragOver,
  addAttachments,
  removeAttachment,
  clearAttachments,
} = useFileHandlingStore();
```

## Migration Benefits

1. **Better Performance**: Zustand only re-renders components when their specific subscribed state changes
2. **Simpler API**: No need for Context providers or complex hook patterns
3. **Easier Testing**: Stores can be easily mocked and tested in isolation
4. **Type Safety**: Full TypeScript support with better type inference
5. **DevTools**: Built-in Redux DevTools support for debugging
6. **Bundle Size**: Smaller bundle size compared to Redux

## Migration Notes

### Removed Files

- `context/ModelsContext.tsx`
- `context/ModelsContext.ts`
- `context/SettingsContext.tsx`
- `context/SettingsContext.ts`
- `context/useModels.ts`
- `context/useSettings.ts`

### Updated Files

- `main.tsx`: Removed Context providers, added store initialization
- `App.tsx`: Updated to use Zustand stores instead of hooks
- `components/Settings/SettingsDialog.tsx`: Updated to use settings dialog store
- `components/Chat/Chat/MessageInput.tsx`: Updated to use models and file handling stores
- `components/Chat/Chat/MessageList.tsx`: Updated to use UI store
- `components/Chat/Chat/MessageItem.tsx`: Updated to use UI store

### Store Initialization

Stores are initialized in `main.tsx`:

```typescript
// Initialize stores
useModelsStore.getState().reloadModels();
useSettingsStore.getState().reloadSettings();
useChatStore.getState().initialize();
```

## Best Practices

1. **Use the hook in components**: `const { state } = useStore()`
2. **Use getState() for one-time access**: `useStore.getState().action()`
3. **Subscribe to specific state**: Only subscribe to the state you need
4. **Use TypeScript**: All stores are fully typed
5. **Keep stores focused**: Each store handles a specific domain

## Troubleshooting

### Common Issues

1. **Type errors**: Make sure to import the correct types from the store
2. **Circular dependencies**: Avoid importing stores from within other stores
3. **Performance**: Only subscribe to the state you need in each component

### Debugging

Use Redux DevTools to inspect store state and actions:

```typescript
// In store creation
export const useStore = create<State>()(
  devtools(
    (set, get) => ({
      // store implementation
    }),
    { name: "Store Name" }
  )
);
```
