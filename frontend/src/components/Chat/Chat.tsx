/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { MessageInput } from "./MessageInput";
import type { Message } from "./models";
import { MessageList } from "./MessageList";
import { ErrorBoundary } from "../../ErrorBoundary";

interface ChatProps {
  messages: Message[];
  isLoading: boolean;
  onNewChat: () => void;
  onSendMessage: (message: string, model: string, attachments?: File[]) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

const chatContainerStyle = css`
  display: flex;
  flex-direction: column;
  max-width: 64rem;
  margin: 0 auto;
`;

const messageInputContainerStyle = css`
  position: sticky;
  bottom: 0;
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
}: ChatProps) {
  return (
    <div css={chatContainerStyle}>
      {/* Messages Area */}
      <ErrorBoundary>
        <MessageList
          messages={messages}
          isThinking={isLoading}
          onNewChat={onNewChat}
          onLoadMore={onLoadMore}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
        />
      </ErrorBoundary>

      {/* Message Input */}
      <div css={messageInputContainerStyle}>
        <ErrorBoundary>
          <MessageInput
            onSendMessage={onSendMessage}
            disabled={isLoading}
            placeholder="Type your message..."
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
