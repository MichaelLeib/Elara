/** @jsxImportSource @emotion/react */
import { useEffect, useRef, useCallback } from "react";
import type { MessageListProps as OriginalMessageListProps } from "./models";
import dayjs from "dayjs";
import { Loader } from "../UI/Loader";
import { Icon } from "../UI/Icon";
import {
  enterButtonStyle,
  loadMoreStyle,
  messageBubbleStyle,
  messageContainerStyle,
  messageListContainerStyle,
  messageModelStyle,
  messageTimestampStyle,
  thinkingContainerStyle,
} from "./MessageList.ts";

interface MessageListProps extends OriginalMessageListProps {
  onAppendToInput?: (text: string) => void;
}

const formatMessage = (message: string) => {
  if (!message) return "";

  return (
    message
      // Handle bullet points (both - and *)
      .replace(/^[-*]\s+/gm, "• ")
      // Handle numbered lists (preserve them)
      .replace(/^(\d+\.\s+)/gm, "$1")
      // Add line breaks for better readability
      .split("\n")
      .map((line) => {
        // If line is too long, break it at sentence boundaries
        if (line.length > 80) {
          return line.replace(/([.!?])\s+/g, "$1\n");
        }
        return line;
      })
      .join("\n")
      // Clean up multiple line breaks
      .replace(/\n\s*\n/g, "\n\n")
      .trim()
  );
};

export function MessageList({
  messages,
  isThinking = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  onAppendToInput,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollThreshold = 100; // pixels from top to trigger load more
  const userHasScrolledUpRef = useRef(false);
  const previousMessageCountRef = useRef(0);

  // Filter out any invalid messages
  const validMessages = messages.filter((msg) => {
    if (!msg || typeof msg !== "object") {
      console.warn("Invalid message found:", msg);
      return false;
    }
    return true;
  });

  // Handle scroll to detect when to load more messages
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !onLoadMore || !hasMore || isLoadingMore) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    // Check if user has scrolled up (not at bottom)
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
    userHasScrolledUpRef.current = !isAtBottom;

    if (scrollTop <= scrollThreshold) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, isLoadingMore, scrollThreshold]);

  // Auto-scroll to bottom when messages change or thinking state changes
  useEffect(() => {
    const scrollToBottom = () => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    };

    const currentMessageCount = validMessages.length;
    const isNewMessage = currentMessageCount > previousMessageCountRef.current;
    const isFirstLoad = previousMessageCountRef.current === 0;

    // Only autoscroll if:
    // 1. This is the first load (app startup)
    // 2. A new message was added AND user hasn't scrolled up
    // 3. Thinking state changed (AI is responding)
    if (
      isFirstLoad ||
      (isNewMessage && !userHasScrolledUpRef.current) ||
      isThinking
    ) {
      // Small delay to ensure DOM has updated
      const timeoutId = setTimeout(scrollToBottom, 50);
      return () => clearTimeout(timeoutId);
    }

    // Update the previous message count
    previousMessageCountRef.current = currentMessageCount;
  }, [messages, isThinking, validMessages.length]);

  return (
    <div
      ref={containerRef}
      css={messageListContainerStyle}
      onScroll={handleScroll}
    >
      <div
        css={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          width: "100%",
          paddingTop: "3rem",
        }}
      >
        {/* Load more indicator */}
        {hasMore && (
          <div css={loadMoreStyle}>
            {isLoadingMore ? (
              <>
                <Loader />
                <span style={{ marginLeft: "0.5rem" }}>
                  Loading more messages...
                </span>
              </>
            ) : (
              <span>Scroll up to load more messages</span>
            )}
          </div>
        )}

        {validMessages.map((msg, index) => {
          return (
            <div
              key={index}
              css={messageContainerStyle(msg.user_id === "user")}
            >
              <div css={messageTimestampStyle()}>
                {dayjs(msg.created_at).format("ddd, MMM D • HH:mm")}
              </div>
              {msg.user_id === "assistant" && (
                <div css={messageModelStyle()}>
                  {typeof msg.model === "string"
                    ? msg.model
                    : typeof msg.model === "object" && msg.model
                    ? msg.model.name || "[Unknown Model]"
                    : "[Invalid model]"}
                </div>
              )}
              <div
                css={messageBubbleStyle(msg.user_id === "user")}
                style={{ position: "relative" }}
              >
                {msg.message === "" && isThinking ? (
                  <div css={thinkingContainerStyle}>
                    <Loader />
                  </div>
                ) : typeof msg.message === "string" ? (
                  <>
                    {formatMessage(msg.message)}
                    {msg.user_id === "user" && onAppendToInput && (
                      <button
                        css={enterButtonStyle}
                        title="Copy to input"
                        onClick={() => onAppendToInput(msg.message)}
                      >
                        <Icon
                          name="arrow-down"
                          size={6}
                        />
                      </button>
                    )}
                  </>
                ) : (
                  "[Invalid message object]"
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
//endregion
