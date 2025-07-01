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

// Global WebSocket store for stop functionality
let currentWebSocket: WebSocket | null = null;

// Listen for stop requests
if (typeof window !== "undefined") {
  window.addEventListener("websocket-stop-request", ((event: CustomEvent) => {
    if (currentWebSocket && currentWebSocket.readyState === WebSocket.OPEN) {
      const stopMessage = {
        type: "stop",
        timestamp: event.detail.timestamp,
      };
      currentWebSocket.send(JSON.stringify(stopMessage));
    } else {
      console.warn("🔄 [CHATAPI] WebSocket not available for stop request");
    }
  }) as EventListener);
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

  // Convert HTTP URL to WebSocket URL
  const wsUrl =
    config.API_URL.replace("http://", "ws://").replace("https://", "wss://") +
    "/chat";
  const ws = new WebSocket(wsUrl);

  // Store the WebSocket instance globally for stop functionality
  currentWebSocket = ws;

  return new Promise((resolve, reject) => {
    ws.onopen = () => {
      (async () => {
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
              console.log(
                `Processed ${processedFiles.length} files for analysis`
              );
            } catch (error) {
              console.error("Error processing files:", error);
              reject(error);
              ws.close();
              return;
            }
          }

          ws.send(JSON.stringify(payload));
          console.log("Message sent to WebSocket:", {
            ...payload,
            files: payload.files ? `${payload.files.length} files` : undefined,
          });
        } catch (error) {
          console.error("Error preparing message:", error);
          reject(error);
          ws.close();
        }
      })();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "chunk") {
          onChunk?.(data.content, false);
        } else if (data.type === "done") {
          onChunk?.("", true);
          ws.close();
          currentWebSocket = null;
          resolve();
        } else if (data.type === "error") {
          onChunk?.("", true, data.content);
          ws.close();
          currentWebSocket = null;
          reject(new Error(data.content));
        } else if (data.type === "document_analysis") {
          // Handle document analysis response
          console.log("Frontend received document_analysis response:", {
            contentLength: data.content?.length || 0,
            metadata: data.metadata,
            progress: data.progress,
            done: data.done,
          });
          onChunk?.(data.content, true);
          if (data.metadata) {
            console.log("Document analysis metadata:", data.metadata);
          }
          ws.close();
          currentWebSocket = null;
          resolve();
        } else if (data.type === "image_analysis") {
          // Handle image analysis response
          console.log("Frontend received image_analysis response:", {
            contentLength: data.content?.length || 0,
            metadata: data.metadata,
            progress: data.progress,
            done: data.done,
          });
          onChunk?.(data.content, true);
          if (data.metadata) {
            console.log("Image analysis metadata:", data.metadata);
          }
          ws.close();
          currentWebSocket = null;
          resolve();
        } else if (data.type === "document_analysis_chunk") {
          // Handle streaming document analysis chunks
          console.log(
            "🔄 [WEBSOCKET] Frontend received document_analysis_chunk:",
            {
              contentLength: data.content?.length || 0,
              progress: data.progress,
              done: data.done,
              content:
                data.content?.substring(0, 100) +
                (data.content?.length > 100 ? "..." : ""),
            }
          );
          onChunk?.(data.content, false, undefined, data.progress);
        } else if (data.type === "file_analysis_chunk") {
          // Handle streaming file analysis chunks (documents and images)
          console.log("🔄 [WEBSOCKET] Frontend received file_analysis_chunk:", {
            contentLength: data.content?.length || 0,
            progress: data.progress,
            done: data.done,
            content:
              data.content?.substring(0, 100) +
              (data.content?.length > 100 ? "..." : ""),
          });
          onChunk?.(data.content, false, undefined, data.progress);
        } else if (data.type === "image_analysis_chunk") {
          // Handle streaming image analysis chunks
          console.log(
            "🔄 [WEBSOCKET] Frontend received image_analysis_chunk:",
            {
              contentLength: data.content?.length || 0,
              progress: data.progress,
              done: data.done,
              content:
                data.content?.substring(0, 100) +
                (data.content?.length > 100 ? "..." : ""),
            }
          );
          onChunk?.(data.content, false, undefined, data.progress);
        } else if (data.type === "clear_progress") {
          // Handle clear progress signal - clear any progress messages and start fresh
          console.log("🔄 [WEBSOCKET] Clear progress signal received:", {
            progress: data.progress,
            done: data.done,
          });
          // Send empty content to clear the message, but with a special flag
          onChunk?.("", false, undefined, data.progress, true); // Added clear flag
        } else if (data.type === "status") {
          // Handle status updates (e.g., "Analyzing documents...")
          console.log("🔄 [WEBSOCKET] Status update:", {
            content: data.content,
            progress: data.progress,
            contentLength: data.content?.length || 0,
          });
          onChunk?.(data.content, false, undefined, data.progress);
        } else if (data.type === "memory_updated") {
          // Handle memory update notifications
          console.log("🧠 [WEBSOCKET] Memory updated:", {
            content: data.content,
            saved_items: data.saved_items,
            total_saved: data.total_saved,
          });
          // Dispatch a custom event for the UI to listen to
          window.dispatchEvent(
            new CustomEvent("memory-updated", {
              detail: {
                content: data.content,
                saved_items: data.saved_items,
                total_saved: data.total_saved,
              },
            })
          );
        } else {
          // Fallback for non-streaming responses
          onChunk?.(event.data, true);
          ws.close();
          currentWebSocket = null;
          resolve();
        }
      } catch {
        // If parsing fails, treat as plain text
        onChunk?.(event.data, true);
        ws.close();
        currentWebSocket = null;
        resolve();
      }
    };

    ws.onerror = (event) => {
      console.error("WebSocket error:", event);
      currentWebSocket = null;
      reject(new Error("WebSocket connection failed"));
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      currentWebSocket = null;
    };
  });
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

  console.log(
    `getChatSessionMessages called with sessionId=${sessionId}, limit=${limit}, offset=${offset}, using finalLimit=${finalLimit}, finalOffset=${finalOffset}`
  ); // Debug log

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
