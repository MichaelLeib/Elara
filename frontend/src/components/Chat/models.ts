export type Message = {
  created_at: string;
  id: string;
  message: string;
  model: string | Model;
  updated_at: string;
  user_id: string;
};

export type MessageListProps = {
  messages: Message[];
  isThinking?: boolean;
  className?: string;
  onNewChat?: () => void;
};

export type MessageInputProps = {
  onSendMessage: (message: string, model: string, attachments?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
};

export type Model = {
  name: string;
  model?: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  details?: Record<string, unknown>;
};
