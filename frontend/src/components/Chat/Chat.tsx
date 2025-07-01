/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { MessageInput } from "./MessageInput";
import type { MessageInputHandle } from "./MessageInput";
import type { Message } from "./models";
import { MessageList } from "./MessageList.tsx";
import { ErrorBoundary } from "../../ErrorBoundary";
import { useRef } from "react";
import { FaLock } from "react-icons/fa6";

interface ChatProps {
  messages: Message[];
  isLoading: boolean;
  onNewChat: () => void;
  onSendMessage: (message: string, model: string, attachments?: File[]) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  isPrivate?: boolean;
}

const chatContainerStyle = (isPrivate: boolean) => css`
  display: flex;
  flex-direction: column;
  max-width: 64rem;
  margin: 0 auto 10rem;
  height: 100%;
  min-height: 0;
  position: relative;
  :1rem ;

  ${isPrivate &&
  `
    background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
    border-radius: 1.5rem;
    border: 1px solid rgba(139, 92, 246, 0.2);
	padding: 1rem rem 1rem 1rem;
    
    @media (prefers-color-scheme: dark) {
      background: linear-gradient(135deg, #2e1065 0%, #4c1d95 100%);
      border: 1px solid rgba(139, 92, 246, 0.3);
    }
  `}
`;

const privateChatIndicatorStyle = css`
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(139, 92, 246, 0.9);
  color: #f3e8ff;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(139, 92, 246, 0.3);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);

  @media (prefers-color-scheme: dark) {
    background: rgba(139, 92, 246, 0.8);
    color: #f3e8ff;
    border: 1px solid rgba(139, 92, 246, 0.4);
  }
`;

const chatMessageListContainerStyle = css`
  flex: 1;
  min-height: 0;
  overflow: hidden;
  margin-top: 1rem;
`;

const chatMessageInputContainerStyle = css`
  flex-shrink: 0;
  width: 100%;
`;

export function Chat({
  messages,
  isLoading,
  onNewChat,
  onSendMessage,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  isPrivate,
}: ChatProps) {
  const messageInputRef = useRef<MessageInputHandle>(null);

  const handleAppendToInput = (text: string) => {
    messageInputRef.current?.appendToInput(text);
  };

  return (
    <div css={chatContainerStyle(isPrivate || false)}>
      {/* Private Chat Indicator */}
      {isPrivate && (
        <div css={privateChatIndicatorStyle}>
          <FaLock size={12} />
          <span>Private Chat</span>
        </div>
      )}

      {/* Messages Area */}
      <div css={chatMessageListContainerStyle}>
        <ErrorBoundary>
          <MessageList
            messages={messages}
            isThinking={isLoading}
            onNewChat={onNewChat}
            onLoadMore={onLoadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onAppendToInput={handleAppendToInput}
            isPrivate={isPrivate}
          />
        </ErrorBoundary>
      </div>

      {/* Message Input */}
      <div css={chatMessageInputContainerStyle}>
        <ErrorBoundary>
          <MessageInput
            ref={messageInputRef}
            onSendMessage={onSendMessage}
            disabled={isLoading}
            placeholder="Type your message..."
            messages={messages}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
