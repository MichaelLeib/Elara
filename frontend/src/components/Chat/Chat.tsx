/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { MessageInput } from "./MessageInput";
import type { MessageInputHandle } from "./MessageInput";
import type { Message } from "./models";
import { MessageList } from "./MessageList.tsx";
import { ErrorBoundary } from "../../ErrorBoundary";
import { useRef } from "react";

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

const chatContainerStyle = css`
  display: flex;
  flex-direction: column;
  max-width: 64rem;
  margin: 0 auto;
`;

const chatMessageInputContainerStyle = css`
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
  isPrivate,
}: ChatProps) {
  const messageInputRef = useRef<MessageInputHandle>(null);

  const handleAppendToInput = (text: string) => {
    messageInputRef.current?.appendToInput(text);
  };

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
          onAppendToInput={handleAppendToInput}
          isPrivate={isPrivate}
        />
      </ErrorBoundary>

      {/* Message Input */}
      <div css={chatMessageInputContainerStyle}>
        <ErrorBoundary>
          <MessageInput
            ref={messageInputRef}
            onSendMessage={onSendMessage}
            disabled={isLoading}
            placeholder="Type your message..."
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
