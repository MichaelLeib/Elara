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

export type Message = {
  created_at: string;
  id: string;
  message: string;
  model: string | Model;
  updated_at: string;
  user_id: string;
  files?: FileInfo[];
  web_search_sources?: WebSearchSource[];
};

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
