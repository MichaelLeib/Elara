import config from "../assets/config.json";
import type { Message, Model } from "../components/Chat/models";

export interface MemoryEntry {
  key: string;
  value: string;
}

export interface AvailableModel {
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  best_for: string[];
  recommended_for: string;
  recommended: boolean;
  installed: boolean;
}

export interface SystemInfo {
  cpu_count: number;
  memory_gb: number;
  platform: string;
  architecture: string;
}

export interface AvailableModelsResponse {
  installed_models: AvailableModel[];
  available_models: AvailableModel[];
  system_info: SystemInfo;
}

export async function sendMessageWebSocket(
  message: string,
  model?: string,
  onChunk?: (chunk: string, done: boolean, error?: string) => void
): Promise<void> {
  console.log("Sending message to WebSocket:", { message, model });
  // Convert HTTP URL to WebSocket URL
  const wsUrl =
    config.API_URL.replace("http://", "ws://").replace("https://", "wss://") +
    "/chat";
  const ws = new WebSocket(wsUrl);

  return new Promise((resolve, reject) => {
    ws.onopen = () => {
      ws.send(JSON.stringify({ message, model }));
      console.log("Message sent to WebSocket:", { message, model });
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

export async function getChatHistory(): Promise<Message[]> {
  const res = await fetch(config.API_URL + "/chat-history");
  const data = await res.json();
  return data;
}

// Memory management API functions
export async function getMemory(): Promise<{ entries: MemoryEntry[] }> {
  const res = await fetch(config.API_URL + "/memory");
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

export async function saveMemory(
  entries: MemoryEntry[]
): Promise<{ status: string; message: string }> {
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
  const res = await fetch(config.API_URL + "/models/available");
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

export async function downloadModel(
  modelName: string
): Promise<{ status: string; message: string }> {
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
): Promise<{ status: string; message: string }> {
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
): Promise<{ status: string; progress?: string; message?: string }> {
  const res = await fetch(
    config.API_URL + `/models/download-status/${modelName}`
  );
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}
