/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useEffect, useRef, useCallback } from "react";
import type { MessageListProps } from "./models";
import dayjs from "dayjs";
import { Loader } from "../UI/Loader";

const containerStyle = css`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  height: 90vh;
  overflow-y: auto;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  position: relative;

  @media (prefers-color-scheme: dark) {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  }

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.3);
    border-radius: 3px;

    @media (prefers-color-scheme: dark) {
      background: rgba(75, 85, 99, 0.3);
    }
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.5);

    @media (prefers-color-scheme: dark) {
      background: rgba(75, 85, 99, 0.5);
    }
  }
`;

const messageContainerStyle = (isUser: boolean) => css`
  display: flex;
  flex-direction: column;
  align-items: ${isUser ? "flex-end" : "flex-start"};
  gap: 0.75rem;
  max-width: 85%;
  margin: ${isUser ? "0 0 0 auto" : "0 auto 0 0"};
  animation: fadeInUp 0.3s ease-out;

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const messageBubbleStyle = (isUser: boolean) => css`
  max-width: 100%;
  padding: 1rem 1.25rem;
  border-radius: 1.25rem;
  font-size: 0.95rem;
  text-align: start;
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.6;
  font-weight: 400;
  letter-spacing: 0.01em;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
  position: relative;

  /* Enhanced bullet points */
  ul,
  ol {
    margin: 0.75rem 0;
    padding-left: 1.75rem;
  }

  li {
    margin: 0.5rem 0;
    line-height: 1.5;
  }

  /* Code blocks */
  code {
    background: rgba(0, 0, 0, 0.05);
    padding: 0.2rem 0.4rem;
    border-radius: 0.375rem;
    font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
    font-size: 0.85em;

    @media (prefers-color-scheme: dark) {
      background: rgba(255, 255, 255, 0.1);
    }
  }

  /* Links */
  a {
    color: inherit;
    text-decoration: underline;
    text-decoration-color: rgba(255, 255, 255, 0.6);
    text-underline-offset: 2px;

    &:hover {
      text-decoration-color: rgba(255, 255, 255, 0.9);
    }
  }

  ${isUser
    ? `
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    border-bottom-right-radius: 0.5rem;
    
    &:hover {
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      transform: translateY(-1px);
    }
    
    a {
      color: #bfdbfe;
      text-decoration-color: rgba(191, 219, 254, 0.6);
      
      &:hover {
        color: #dbeafe;
        text-decoration-color: rgba(219, 234, 254, 0.9);
      }
    }
  `
    : `
    background: #f8fafc;
    color: #1f2937;
    border-bottom-left-radius: 0.5rem;
    border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.15);
    
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
      border-color: #cbd5e1;
    }
    
    a {
      color: #2563eb;
      text-decoration-color: rgba(37, 99, 235, 0.6);
      
      &:hover {
        color: #1d4ed8;
        text-decoration-color: rgba(29, 78, 216, 0.9);
      }
    }
    
    @media (prefers-color-scheme: dark) {
      background: #1e293b;
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.1);
      
      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border-color: rgba(255, 255, 255, 0.2);
      }
      
      a {
        color: #60a5fa;
        text-decoration-color: rgba(96, 165, 250, 0.6);
        
        &:hover {
          color: #3b82f6;
          text-decoration-color: rgba(59, 130, 246, 0.9);
        }
      }
    }
  `}
`;

const messageTimestampStyle = () => css`
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  letter-spacing: 0.025em;
  margin-bottom: 0.25rem;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

const messageModelStyle = () => css`
  font-size: 0.7rem;
  color: #9ca3af;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
  opacity: 0.8;

  @media (prefers-color-scheme: dark) {
    color: #6b7280;
  }
`;

const thinkingContainerStyle = css`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 1.25rem;
  border-bottom-left-radius: 0.5rem;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  animation: pulse 2s ease-in-out infinite;

  @media (prefers-color-scheme: dark) {
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }
`;

const loadMoreStyle = css`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  color: #6b7280;
  font-size: 0.875rem;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  border-radius: 0.75rem;
  margin: 1rem 0;
  border: 1px solid rgba(0, 0, 0, 0.05);

  @media (prefers-color-scheme: dark) {
    background: rgba(30, 41, 59, 0.8);
    color: #9ca3af;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

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
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollThreshold = 100; // pixels from top to trigger load more

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

    const { scrollTop } = containerRef.current;
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

    // Small delay to ensure DOM has updated
    const timeoutId = setTimeout(scrollToBottom, 50);

    return () => clearTimeout(timeoutId);
  }, [messages, isThinking, validMessages.length]);

  // Additional effect to handle streaming updates
  useEffect(() => {
    const scrollToBottom = () => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    };

    // Immediate scroll for streaming updates
    scrollToBottom();
  });

  return (
    <div
      ref={containerRef}
      css={containerStyle}
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
              <div css={messageBubbleStyle(msg.user_id === "user")}>
                {msg.message === "" && isThinking ? (
                  <div css={thinkingContainerStyle}>
                    <Loader />
                  </div>
                ) : typeof msg.message === "string" ? (
                  formatMessage(msg.message)
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
