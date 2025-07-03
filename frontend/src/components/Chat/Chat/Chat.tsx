/** @jsxImportSource @emotion/react */

import type { Message } from "../models";
import { MessageList } from "./MessageList";
import { ErrorBoundary } from "../../../ErrorBoundary";
import { useRef } from "react";
import { FaLock } from "react-icons/fa6";
import {
  chatContainerStyle,
  privateChatIndicatorStyle,
  chatMessageListContainerStyle,
  chatMessageInputContainerStyle,
} from "./ChatStyles";
import { MessageInput, type MessageInputHandle } from "./MessageInput";

interface ChatProps {
  messages: Message[];
  isLoading: boolean;
  onNewChat: () => void;
  onSendMessage: (message: string, model: string, attachments?: File[]) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  isPrivate?: boolean;
  handlePdfChoice?: (msgId: string, choice: "ocr" | "vision") => void;
  currentSessionModel?: string;
}

export function Chat({
  messages,
  isLoading,
  onNewChat,
  onSendMessage,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  isPrivate,
  handlePdfChoice,
  currentSessionModel,
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
            handlePdfChoice={handlePdfChoice}
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
            currentSessionModel={currentSessionModel}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
