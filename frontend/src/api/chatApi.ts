import config from "../assets/config.json";
import type { Model } from "../components/Chat/models";
import { processFilesForAnalysis } from "../utils/fileUtils";
import type {
  AvailableModelsResponse,
  ChatHistoryResponse,
  ChatSessionsResponse,
  CreateChatSessionResponse,
  DeleteChatSessionResponse,
  DownloadModelResponse,
  DownloadStatusResponse,
  MemoryEntry,
  MemoryResponse,
  RemoveModelResponse,
  SaveMemoryResponse,
  Settings,
  UpdateChatSessionResponse,
} from "./models";

// Type definitions for WebSocket manager
interface WebSocketMessage {
  type: string;
  content?: string;
  progress?: number;
  done?: boolean;
  error?: string;
  clear?: boolean;
  metadata?: Record<string, unknown>;
  message?: string;
  filename?: string;
  file_path?: string;
  prompt?: string;
  model?: string;
  search_terms?: string;
  confidence?: string;
  reason?: string;
  sources?: unknown[];
  saved_items?: unknown[];
  total_saved?: number;
  timestamp?: number;
}

interface QueuedMessage {
  data: Record<string, unknown>;
  resolve: (value: void | PromiseLike<void>) => void;
  reject: (reason?: unknown) => void;
}

type EventCallback = (detail: unknown) => void;

interface MessageChunkDetail {
  content?: string;
  done?: boolean;
  error?: string;
  progress?: number;
  clear?: boolean;
}

// Improved WebSocket connection manager
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private messageQueue: QueuedMessage[] = [];
  private eventListeners: Map<string, Set<EventCallback>> = new Map();

  constructor() {
    this.setupGlobalEventListeners();
  }

  private setupGlobalEventListeners() {
    // Listen for stop requests
    if (typeof window !== "undefined") {
      window.addEventListener("websocket-stop-request", ((
        event: CustomEvent
      ) => {
        this.sendMessage({
          type: "stop",
          timestamp: event.detail.timestamp,
        });
      }) as EventListener);
    }
  }

  private getWebSocketUrl(): string {
    return (
      config.API_URL.replace("http://", "ws://").replace("https://", "wss://") +
      "/chat"
    );
  }

  async connect(): Promise<WebSocket> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return this.ws;
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            resolve(this.ws);
          } else if (this.ws?.readyState === WebSocket.CLOSED) {
            reject(new Error("Connection failed"));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.getWebSocketUrl());

        this.ws.onopen = () => {
          console.log("🔄 [WEBSOCKET] Connection established");
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.processMessageQueue();
          resolve(this.ws!);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onerror = (error) => {
          console.error("🔄 [WEBSOCKET] Connection error:", error);
          this.isConnecting = false;
          reject(new Error("WebSocket connection failed"));
        };

        this.ws.onclose = (event) => {
          console.log(
            "🔄 [WEBSOCKET] Connection closed:",
            event.code,
            event.reason
          );
          this.isConnecting = false;
          this.ws = null;

          // Dispatch close event
          this.dispatchEvent("websocket-closed", {
            code: event.code,
            reason: event.reason,
          });

          // Attempt reconnection if not a normal closure
          if (
            event.code !== 1000 &&
            this.reconnectAttempts < this.maxReconnectAttempts
          ) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private async attemptReconnect() {
    this.reconnectAttempts++;
    console.log(
      `🔄 [WEBSOCKET] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
    );

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error("🔄 [WEBSOCKET] Reconnection failed:", error);
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  async sendMessage(data: Record<string, unknown>): Promise<void> {
    const ws = await this.connect();

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      // Queue message if connection is not ready
      return new Promise((resolve, reject) => {
        this.messageQueue.push({ data, resolve, reject });
      });
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const { data, resolve, reject } = this.messageQueue.shift()!;
      this.sendMessage(data).then(resolve).catch(reject);
    }
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data) as WebSocketMessage;
      console.log("🔄 [WEBSOCKET] Received message:", data.type);

      switch (data.type) {
        case "chunk":
          this.dispatchEvent("message-chunk", {
            content: data.content,
            done: false,
          });
          break;

        case "done":
          this.dispatchEvent("message-chunk", { content: "", done: true });
          break;

        case "error":
          this.dispatchEvent("message-chunk", {
            content: "",
            done: true,
            error: data.content,
          });
          break;

        case "document_analysis":
          this.handleDocumentAnalysis(data);
          break;

        case "image_analysis":
          this.handleImageAnalysis(data);
          break;

        case "document_analysis_chunk":
          this.handleDocumentAnalysisChunk(data);
          break;

        case "file_analysis_chunk":
          this.handleFileAnalysisChunk(data);
          break;

        case "image_analysis_chunk":
          this.dispatchEvent("message-chunk", {
            content: data.content,
            done: false,
            progress: data.progress,
          });
          break;

        case "clear_progress":
          this.dispatchEvent("message-chunk", {
            content: "",
            done: false,
            progress: data.progress,
            clear: true,
          });
          break;

        case "status":
          this.handleStatusUpdate(data);
          break;

        case "web_search":
          this.dispatchEvent("web-search-performed", {
            content: data.content,
            search_terms: data.search_terms,
            confidence: data.confidence,
            reason: data.reason,
            sources: data.sources || [],
            done: data.done,
          });
          break;

        case "memory_updated":
          this.dispatchEvent("memory-updated", {
            content: data.content,
            saved_items: data.saved_items,
            total_saved: data.total_saved,
          });
          break;

        case "image_based_pdf_choice":
          this.dispatchEvent("image-based-pdf-choice", {
            message: data.message,
            filename: data.filename,
            file_path: data.file_path,
            prompt: data.prompt,
            model: data.model,
          });
          break;

        default:
          // Fallback for non-streaming responses
          this.dispatchEvent("message-chunk", {
            content: event.data,
            done: true,
          });
          break;
      }
    } catch (error) {
      console.error("🔄 [WEBSOCKET] Error parsing message:", error);
      // If parsing fails, treat as plain text
      this.dispatchEvent("message-chunk", { content: event.data, done: true });
    }
  }

  private handleDocumentAnalysis(data: WebSocketMessage) {
    console.log("🔄 [WEBSOCKET] Document analysis response:", {
      contentLength: data.content?.length || 0,
      metadata: data.metadata,
      progress: data.progress,
      done: data.done,
    });

    // Check if we have an active PDF choice message
    const pdfChoiceId = this.getPdfChoiceMessageId();
    if (pdfChoiceId) {
      this.dispatchEvent("file_analysis_chunk", {
        id: pdfChoiceId,
        content: data.content,
        done: true,
      });
      this.clearPdfChoiceMessageId();
    } else {
      this.dispatchEvent("message-chunk", {
        content: data.content,
        done: true,
      });
    }

    this.dispatchEvent("ocr-result", {
      content: data.content,
      metadata: data.metadata,
      type: data.type,
    });

    // Dispatch analysis-complete event to clear progress
    this.dispatchEvent("analysis-complete", {
      content: data.content,
      metadata: data.metadata,
      type: data.type,
    });
  }

  private handleImageAnalysis(data: WebSocketMessage) {
    console.log("🔄 [WEBSOCKET] Image analysis response:", {
      contentLength: data.content?.length || 0,
      metadata: data.metadata,
      progress: data.progress,
      done: data.done,
    });

    // Check if we have an active PDF choice message
    const pdfChoiceId = this.getPdfChoiceMessageId();
    if (pdfChoiceId) {
      this.dispatchEvent("file_analysis_chunk", {
        id: pdfChoiceId,
        content: data.content,
        done: true,
      });
      this.clearPdfChoiceMessageId();
    } else {
      this.dispatchEvent("message-chunk", {
        content: data.content,
        done: true,
      });
    }

    this.dispatchEvent("vision-result", {
      content: data.content,
      metadata: data.metadata,
      type: data.type,
    });

    // Dispatch analysis-complete event to clear progress
    this.dispatchEvent("analysis-complete", {
      content: data.content,
      metadata: data.metadata,
      type: data.type,
    });
  }

  private handleDocumentAnalysisChunk(data: WebSocketMessage) {
    console.log("🔄 [WEBSOCKET] Document analysis chunk:", {
      contentLength: data.content?.length || 0,
      progress: data.progress,
      done: data.done,
    });

    const pdfChoiceId = this.getPdfChoiceMessageId();
    if (pdfChoiceId) {
      this.dispatchEvent("pdf-choice-chunk", {
        id: pdfChoiceId,
        content: data.content,
        done: data.done,
      });
    } else {
      this.dispatchEvent("message-chunk", {
        content: data.content,
        done: false,
        progress: data.progress,
      });
    }
  }

  private handleFileAnalysisChunk(data: WebSocketMessage) {
    console.log("🔄 [WEBSOCKET] File analysis chunk:", {
      contentLength: data.content?.length || 0,
      progress: data.progress,
      done: data.done,
    });

    const pdfChoiceId = this.getPdfChoiceMessageId();
    if (pdfChoiceId) {
      // Dispatch progress event for PDF analysis
      if (data.progress !== undefined && data.progress !== null) {
        this.dispatchEvent("document-analysis-progress", {
          progress: data.progress,
          text: data.content,
        });
      }

      this.dispatchEvent("file_analysis_chunk", {
        id: pdfChoiceId,
        content: data.content,
        done: data.done,
      });
    } else {
      this.dispatchEvent("message-chunk", {
        content: data.content,
        done: false,
        progress: data.progress,
      });
    }
  }

  private handleStatusUpdate(data: WebSocketMessage) {
    console.log("🔄 [WEBSOCKET] Status update:", {
      content: data.content,
      progress: data.progress,
    });

    const pdfChoiceId = this.getPdfChoiceMessageId();
    if (pdfChoiceId && data.progress !== undefined && data.progress !== null) {
      this.dispatchEvent("document-analysis-progress", {
        progress: data.progress,
        text: data.content,
      });
    } else {
      this.dispatchEvent("message-chunk", {
        content: data.content,
        done: false,
        progress: data.progress,
      });
    }
  }

  // Event management
  addEventListener(event: string, callback: EventCallback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  removeEventListener(event: string, callback: EventCallback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private dispatchEvent(event: string, detail: unknown) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(detail);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }

    // Also dispatch as window event for backward compatibility
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(event, { detail }));
    }
  }

  // PDF choice message management
  private pdfChoiceMessageId: string | null = null;

  setPdfChoiceMessageId(id: string) {
    this.pdfChoiceMessageId = id;
  }

  getPdfChoiceMessageId(): string | null {
    return this.pdfChoiceMessageId;
  }

  clearPdfChoiceMessageId() {
    this.pdfChoiceMessageId = null;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, "User initiated disconnect");
      this.ws = null;
    }
    this.isConnecting = false;
    this.messageQueue = [];
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Global WebSocket manager instance
const wsManager = new WebSocketManager();

// Export the manager for use in other parts of the app
export { wsManager };

// Legacy exports for backward compatibility
export let pdfChoiceMessageIdRef: { current: string | null } = {
  current: null,
};

export function setPdfChoiceMessageIdRef(ref: { current: string | null }) {
  pdfChoiceMessageIdRef = ref;
  // Sync with the new manager
  wsManager.setPdfChoiceMessageId(ref.current || "");
}

export async function sendMessageWebSocket(
  message: string,
  model?: string,
  session_id?: string,
  isPrivate: boolean = false,
  attachments?: File[],
  onChunk?: (
    chunk: string,
    done: boolean,
    error?: string,
    progress?: number,
    clear?: boolean
  ) => void
): Promise<void> {
  console.log("Sending message to WebSocket:", {
    message,
    model,
    session_id,
    isPrivate,
    attachments: attachments?.map((f) => f.name),
  });

  // Set up event listeners for this message
  const messageChunkHandler = (detail: unknown) => {
    const chunkDetail = detail as MessageChunkDetail;
    onChunk?.(
      chunkDetail.content || "",
      chunkDetail.done || false,
      chunkDetail.error,
      chunkDetail.progress,
      chunkDetail.clear
    );
  };

  wsManager.addEventListener("message-chunk", messageChunkHandler);

  try {
    const payload: {
      message: string;
      model?: string;
      session_id?: string;
      isPrivate: boolean;
      files?: Array<{ filename: string; content: string }>;
    } = { message, isPrivate };

    if (model) {
      payload.model = model;
    }
    if (session_id) {
      payload.session_id = session_id;
    }

    // Process files if attachments are provided
    if (attachments && attachments.length > 0) {
      try {
        const processedFiles = await processFilesForAnalysis(attachments);
        payload.files = processedFiles;
        console.log(`Processed ${processedFiles.length} files for analysis`);
      } catch (error) {
        console.error("Error processing files:", error);
        throw error;
      }
    }

    await wsManager.sendMessage(payload);
    console.log("Message sent to WebSocket:", {
      ...payload,
      files: payload.files ? `${payload.files.length} files` : undefined,
    });
  } finally {
    // Clean up event listener
    wsManager.removeEventListener("message-chunk", messageChunkHandler);
  }
}

export async function sendMessage(
  message: string,
  model?: string
): Promise<string> {
  // Replace with your backend endpoint
  const requestBody: { message: string; model?: string } = { message };
  if (model) {
    requestBody.model = model;
  }

  const res = await fetch(config.API_URL + "/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }

  const data = await res.json();
  console.log("Chat API Response:", data);

  // Handle different response structures
  if (data.reply) {
    return data.reply;
  } else if (data.response) {
    return data.response;
  } else if (data.message) {
    return data.message;
  } else if (data.content) {
    return data.content;
  } else if (typeof data === "string") {
    return data;
  } else {
    console.error("Unexpected API response structure:", data);
    return JSON.stringify(data);
  }
}

export async function getModels(): Promise<{ models: Model[] }> {
  const res = await fetch(config.API_URL + "/models");
  const data = await res.json();
  data.models.sort((a: Model, b: Model) => a.name.localeCompare(b.name));
  return data;
}

export async function getChatHistory(
  limit?: number,
  offset?: number
): Promise<ChatHistoryResponse> {
  if (limit === undefined || offset === undefined) {
    const settings = await getSettings();
    if (limit === undefined) limit = settings.message_limit;
    if (offset === undefined) offset = settings.message_offset;
  }
  const res = await fetch(
    `${config.API_URL}/chat-history?limit=${limit}&offset=${offset}`
  );
  const data = await res.json();
  return data;
}

// Memory management API functions
export async function getMemory(): Promise<MemoryResponse> {
  const res = await fetch(config.API_URL + "/memory");
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

export async function saveMemory(
  entries: MemoryEntry[]
): Promise<SaveMemoryResponse> {
  const res = await fetch(config.API_URL + "/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries }),
  });

  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }

  return res.json();
}

// Model management API functions
export async function getAvailableModels(): Promise<AvailableModelsResponse> {
  try {
    // Get all model information from the backend endpoint
    const res = await fetch(config.API_URL + "/models/available");
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching models:", error);
    throw error;
  }
}

export async function downloadModel(
  modelName: string
): Promise<DownloadModelResponse> {
  const res = await fetch(config.API_URL + "/models/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model_name: modelName }),
  });

  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }

  return res.json();
}

export async function removeModel(
  modelName: string
): Promise<RemoveModelResponse> {
  const res = await fetch(config.API_URL + `/models/${modelName}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }

  return res.json();
}

export async function getDownloadStatus(
  modelName: string
): Promise<DownloadStatusResponse> {
  const res = await fetch(
    config.API_URL + `/models/download-status/${modelName}`
  );
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

export async function getChatSessionMessages(
  sessionId: string,
  settings: {
    message_limit: number;
    message_offset: number;
  },
  limit?: number,
  offset?: number
): Promise<ChatHistoryResponse> {
  const finalLimit = limit ?? settings.message_limit;
  const finalOffset = offset ?? settings.message_offset;

  const res = await fetch(
    `${config.API_URL}/chat-sessions/${sessionId}/messages?limit=${finalLimit}&offset=${finalOffset}`
  );
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  const data = await res.json();
  return data;
}

export async function getSettings(): Promise<Settings> {
  const res = await fetch(config.API_URL + "/settings");
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

export async function updateSettings(
  settings: Partial<Settings>
): Promise<Settings> {
  const res = await fetch(config.API_URL + "/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

export async function getChatSessions(): Promise<ChatSessionsResponse> {
  const res = await fetch(`${config.API_URL}/chat-sessions`);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

export async function createChatSession(
  title: string,
  isPrivate: boolean = false
): Promise<CreateChatSessionResponse> {
  const res = await fetch(`${config.API_URL}/chat-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, isPrivate }),
  });
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

export async function createPrivateChatSession(
  title: string = "Private Chat"
): Promise<CreateChatSessionResponse> {
  return createChatSession(title, true);
}

export async function updateChatSessionTitle(
  sessionId: string,
  title: string
): Promise<UpdateChatSessionResponse> {
  const res = await fetch(
    `${config.API_URL}/chat-sessions/${sessionId}/title`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }
  );
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

export async function deleteChatSession(
  sessionId: string
): Promise<DeleteChatSessionResponse> {
  const res = await fetch(`${config.API_URL}/chat-sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

// Helper to send a message on the current open WebSocket
export function sendOnCurrentWebSocket(data: Record<string, unknown>) {
  if (wsManager.isConnected()) {
    wsManager.sendMessage(data);
  } else {
    console.warn("No open WebSocket to send message:", data);
  }
}
