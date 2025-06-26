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

export interface LocalModel {
  name: string;
  size?: string;
  modified_at?: string;
}

export interface LocalModelsResponse {
  models: LocalModel[];
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

export async function getChatHistory(
  limit?: number,
  offset?: number
): Promise<{
  messages: Message[];
  total: number;
  has_more: boolean;
}> {
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
  try {
    // Get locally installed models from our backend
    let installedModels: AvailableModel[] = [];
    let systemInfo: SystemInfo = {
      cpu_count: 0,
      memory_gb: 0,
      platform: "Unknown",
      architecture: "Unknown",
    };

    try {
      const [localRes, sysRes] = await Promise.all([
        fetch(config.API_URL + "/models"),
        fetch(config.API_URL + "/system-info"),
      ]);

      if (localRes.ok) {
        const localData: LocalModelsResponse = await localRes.json();
        installedModels =
          localData.models?.map((model: LocalModel) => ({
            name: model.name,
            description: "Locally installed model",
            strengths: ["Fast inference", "Privacy", "Offline use"],
            weaknesses: ["Limited context", "May be outdated"],
            best_for: ["Local development", "Privacy-sensitive tasks"],
            recommended_for: "Local hardware",
            recommended: false,
            installed: true,
          })) || [];
      }

      if (sysRes.ok) {
        systemInfo = await sysRes.json();
      }
    } catch (error) {
      console.warn("Could not fetch local data:", error);
    }

    // Create a curated list of popular models from Ollama
    const popularModels: AvailableModel[] = [
      {
        name: "llama3.1:8b",
        description:
          "Meta's latest 8B parameter model with strong reasoning and modern capabilities.",
        strengths: [
          "Strong reasoning",
          "Modern knowledge",
          "Balanced performance",
        ],
        weaknesses: ["Moderate resource usage", "Not specialized"],
        best_for: ["General chat", "Modern topics", "Balanced tasks"],
        recommended_for: "Mid-high end hardware (6-12GB RAM, 4-8 cores)",
        recommended: true,
        installed: false,
      },
      {
        name: "llama3.1:70b",
        description:
          "Meta's powerful 70B parameter model with exceptional reasoning capabilities.",
        strengths: [
          "Exceptional reasoning",
          "Comprehensive knowledge",
          "Advanced capabilities",
        ],
        weaknesses: [
          "High memory usage",
          "Slow responses",
          "Requires powerful hardware",
        ],
        best_for: ["Complex analysis", "Advanced reasoning", "Research tasks"],
        recommended_for: "Workstation hardware (16GB+ RAM, 8+ cores)",
        recommended: true,
        installed: false,
      },
      {
        name: "gemma3:2b",
        description:
          "Google's latest 2B parameter model optimized for efficiency and safety.",
        strengths: ["Fast inference", "Safety-focused", "Low resource usage"],
        weaknesses: ["Limited reasoning", "Basic knowledge"],
        best_for: ["Quick responses", "Safe interactions", "Basic tasks"],
        recommended_for: "Low-end hardware (2-4GB RAM, 2-4 cores)",
        recommended: true,
        installed: false,
      },
      {
        name: "qwen2.5:7b",
        description:
          "Alibaba's 7B parameter model with strong multilingual capabilities.",
        strengths: [
          "Multilingual support",
          "Good reasoning",
          "Modern knowledge",
        ],
        weaknesses: ["Moderate resource usage"],
        best_for: ["Multilingual chat", "International content", "General use"],
        recommended_for: "Mid-range hardware (4-8GB RAM, 4-6 cores)",
        recommended: true,
        installed: false,
      },
      {
        name: "mistral:7b",
        description:
          "Mistral AI's 7B parameter model with excellent reasoning capabilities.",
        strengths: [
          "Strong reasoning",
          "Code understanding",
          "Efficient performance",
        ],
        weaknesses: ["Limited knowledge base", "Basic document analysis"],
        best_for: ["Programming tasks", "Logical reasoning", "Code assistance"],
        recommended_for: "Mid-range hardware (4-8GB RAM, 4-6 cores)",
        recommended: true,
        installed: false,
      },
      {
        name: "llava:7b",
        description:
          "Multimodal model capable of understanding and analyzing images.",
        strengths: [
          "Image analysis",
          "Visual reasoning",
          "Multimodal capabilities",
        ],
        weaknesses: ["Higher resource usage", "Slower than text-only models"],
        best_for: [
          "Image analysis",
          "Visual tasks",
          "Screenshot understanding",
        ],
        recommended_for: "Mid-high end hardware (8GB+ RAM, 4+ cores)",
        recommended: false,
        installed: false,
      },
      {
        name: "codellama:7b",
        description: "Specialized code generation and analysis model.",
        strengths: [
          "Code generation",
          "Code analysis",
          "Programming assistance",
        ],
        weaknesses: ["Limited general knowledge", "Higher resource usage"],
        best_for: ["Programming", "Code review", "Technical documentation"],
        recommended_for: "Mid-high end hardware (8GB+ RAM, 4+ cores)",
        recommended: false,
        installed: false,
      },
      {
        name: "phi4:14b",
        description:
          "Microsoft's 14B parameter model with strong reasoning and efficiency.",
        strengths: [
          "Good reasoning",
          "Code understanding",
          "Efficient performance",
        ],
        weaknesses: ["Limited knowledge base", "Basic document analysis"],
        best_for: ["Programming tasks", "Logical reasoning", "Code assistance"],
        recommended_for: "Mid-high end hardware (8-12GB RAM, 6-8 cores)",
        recommended: false,
        installed: false,
      },
      {
        name: "deepseek-r1:7b",
        description:
          "DeepSeek's reasoning-focused 7B model with strong logical capabilities.",
        strengths: [
          "Advanced reasoning",
          "Logical thinking",
          "Problem solving",
        ],
        weaknesses: ["Higher resource usage", "Specialized focus"],
        best_for: ["Complex reasoning", "Problem solving", "Analytical tasks"],
        recommended_for: "Mid-high end hardware (8GB+ RAM, 4+ cores)",
        recommended: false,
        installed: false,
      },
      {
        name: "tinyllama:1.1b",
        description:
          "Ultra-compact 1.1B parameter model optimized for speed and efficiency.",
        strengths: [
          "Extremely fast",
          "Very low memory usage",
          "Quick responses",
        ],
        weaknesses: ["Basic reasoning", "Limited knowledge", "Simple outputs"],
        best_for: ["Quick responses", "Simple chat", "Basic tasks"],
        recommended_for: "Low-end hardware (2-4GB RAM, 2-4 cores)",
        recommended: false,
        installed: false,
      },
    ];

    // Filter out models that are already installed
    const availableModels = popularModels.filter(
      (model) =>
        !installedModels.some((installed) => installed.name === model.name)
    );

    return {
      installed_models: installedModels,
      available_models: availableModels,
      system_info: systemInfo,
    };
  } catch (error) {
    console.error("Error fetching models:", error);
    throw error;
  }
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

export async function getChatSessionMessages(
  chatIndex: number,
  settings: {
    message_limit: number;
    message_offset: number;
  },
  limit?: number,
  offset?: number
): Promise<{
  messages: Message[];
  total: number;
  has_more: boolean;
}> {
  const finalLimit = limit ?? settings.message_limit;
  const finalOffset = offset ?? settings.message_offset;

  console.log(
    `getChatSessionMessages called with limit=${limit}, offset=${offset}, using finalLimit=${finalLimit}, finalOffset=${finalOffset}`
  ); // Debug log

  const res = await fetch(
    `${config.API_URL}/chat-sessions/${chatIndex}/messages?limit=${finalLimit}&offset=${finalOffset}`
  );
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  const data = await res.json();
  return data;
}

export async function getSettings(): Promise<{
  OLLAMA_URL: string;
  OLLAMA_MODEL: string;
  timeout: number;
  message_limit: number;
  message_offset: number;
}> {
  const res = await fetch(config.API_URL + "/settings");
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

export async function updateSettings(
  settings: Partial<{
    OLLAMA_URL: string;
    OLLAMA_MODEL: string;
    timeout: number;
    message_limit: number;
    message_offset: number;
  }>
): Promise<{
  OLLAMA_URL: string;
  OLLAMA_MODEL: string;
  timeout: number;
  message_limit: number;
  message_offset: number;
}> {
  const res = await fetch(config.API_URL + "/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}
