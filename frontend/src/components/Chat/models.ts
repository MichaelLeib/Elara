export type FileInfo = {
  filename: string;
  size?: number;
  type?: string;
  content?: string;
};

export type WebSearchSource = {
  title: string;
  url: string;
  snippet: string;
  favicon_url: string;
  domain: string;
};

// Base message interface with common properties
export interface BaseMessage {
  created_at: string;
  id: string;
  message: string;
  user_id: string;
  files?: FileInfo[];
  web_search_sources?: WebSearchSource[];
}

export type PdfChoiceMessage = BaseMessage & {
  type: "pdf_choice";
  filename: string;
  file_path: string;
  prompt: string;
  model: string;
};

export type DefaultMessage = BaseMessage & {
  type?: "default";
  model: string | Model;
  updated_at: string;
};

export type Message = DefaultMessage | PdfChoiceMessage;

export type MessageListProps = {
  messages: Message[];
  isThinking?: boolean;
  className?: string;
  onNewChat?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  isPrivate?: boolean;
};

export type MessageInputProps = {
  onSendMessage: (message: string, model: string, attachments?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  messages?: Message[];
};

export type Model = {
  name: string;
  model?: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  details?: Record<string, unknown>;
};
