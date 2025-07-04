// Import Message and Model types from Chat models
import type { Message } from "../components/Chat/models";

export interface MemoryEntry {
  key: string;
  value: string;
  importance: string;
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

export interface ChatHistoryResponse {
  messages: Message[];
  total: number;
  has_more: boolean;
}

export interface MemoryResponse {
  entries: MemoryEntry[];
}

export interface SaveMemoryResponse {
  status: string;
  message: string;
}

export interface DownloadModelResponse {
  status: string;
  message: string;
}

export interface RemoveModelResponse {
  status: string;
  message: string;
}

export interface DownloadStatusResponse {
  status: string;
  progress?: string;
  message?: string;
}

export interface Settings {
  OLLAMA_URL: string;
  OLLAMA_MODEL: string;
  timeout: number;
  message_limit: number;
  message_offset: number;
  manual_model_switch: boolean;
  auto_model_selection: boolean;
  summarization_prompt: string;
  user_info_extraction_model: string; // "adaptive", "fast", "quality"
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  is_private?: boolean;
  model?: string;
}

export interface ChatSessionsResponse {
  sessions: ChatSession[];
}

export interface CreateChatSessionResponse {
  status: string;
  session: ChatSession;
}

export interface UpdateChatSessionResponse {
  status: string;
  message: string;
}

export interface DeleteChatSessionResponse {
  status: string;
  message: string;
}

// Re-export Message and Model from the Chat models
export type { Message, Model } from "../components/Chat/models";
