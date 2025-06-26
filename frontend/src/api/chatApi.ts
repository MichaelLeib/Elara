import config from "../assets/config.json";
import type { Model } from "../components/Chat/models";
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

export async function sendMessageWebSocket(
  message: string,
  model?: string,
  session_id?: string,
  onChunk?: (chunk: string, done: boolean, error?: string) => void
): Promise<void> {
  console.log("Sending message to WebSocket:", { message, model, session_id });
  // Convert HTTP URL to WebSocket URL
  const wsUrl =
    config.API_URL.replace("http://", "ws://").replace("https://", "wss://") +
    "/chat";
  const ws = new WebSocket(wsUrl);

  return new Promise((resolve, reject) => {
    ws.onopen = () => {
      const payload: { message: string; model?: string; session_id?: string } =
        { message, model };
      if (session_id) {
        payload.session_id = session_id;
      }
      ws.send(JSON.stringify(payload));
      console.log("Message sent to WebSocket:", payload);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "chunk") {
          onChunk?.(data.content, false);
        } else if (data.type === "done") {
          onChunk?.("", true);
          ws.close();
          resolve();
        } else if (data.type === "error") {
          onChunk?.("", true, data.content);
          ws.close();
          reject(new Error(data.content));
        } else {
          // Fallback for non-streaming responses
          onChunk?.(event.data, true);
          ws.close();
          resolve();
        }
      } catch {
        // If parsing fails, treat as plain text
        onChunk?.(event.data, true);
        ws.close();
        resolve();
      }
    };

    ws.onerror = (event) => {
      console.error("WebSocket error:", event);
      reject(new Error("WebSocket connection failed"));
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
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
  title: string
): Promise<CreateChatSessionResponse> {
  const res = await fetch(`${config.API_URL}/chat-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
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
