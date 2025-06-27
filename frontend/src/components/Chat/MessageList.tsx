/** @jsxImportSource @emotion/react */
import { useEffect, useRef, useState } from "react";
import type { MessageListProps as OriginalMessageListProps } from "./models";
import dayjs from "dayjs";
import { FaArrowDown } from "react-icons/fa";
import {
  messageBubbleStyle,
  messageTimestampStyle,
  messageModelStyle,
  enterButtonStyle,
} from "./MessageList.ts";
import { css } from "@emotion/react";

interface MessageListProps extends OriginalMessageListProps {
  onAppendToInput?: (text: string) => void;
  isPrivate?: boolean;
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

const messageListStyle = css`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
  height: 100%;
`;

const messageStyle = css`
  padding: 1rem;
  border-radius: 0.75rem;
  max-width: 80%;
  word-wrap: break-word;
  white-space: pre-wrap;
`;

const userMessageStyle = css`
  ${messageStyle}
  align-self: flex-end;
  margin-left: auto;
`;

const assistantMessageStyle = css`
  ${messageStyle}
  align-self: flex-start;
  margin-right: auto;
`;

const thinkingStyle = css`
  ${assistantMessageStyle}
  opacity: 0.7;
  font-style: italic;
`;

const streamingStyle = css`
  ${assistantMessageStyle}
  position: relative;

  &::after {
    content: "";
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    width: 8px;
    height: 8px;
    background: #3b82f6;
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }
`;

const loadMoreButtonStyle = css`
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  align-self: center;
  margin: 1rem 0;

  &:hover {
    background: #2563eb;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  @media (prefers-color-scheme: dark) {
    background: #1d4ed8;

    &:hover {
      background: #1e40af;
    }
  }
`;

const progressBarContainerStyle = css`
  width: 100%;
  background: #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
  margin: 0.5rem 0;

  @media (prefers-color-scheme: dark) {
    background: #374151;
  }
`;

const progressBarStyle = css`
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  transition: width 0.3s ease;
  border-radius: 0.5rem;
`;

const progressTextStyle = css`
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
  text-align: center;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

export function MessageList({
  messages,
  isThinking = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  onAppendToInput,
  isPrivate = false,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const userHasScrolledUpRef = useRef(false);
  const previousMessageCountRef = useRef(0);
  const previousScrollHeightRef = useRef(0);
  const loadMoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialScrollRef = useRef(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [progressText, setProgressText] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const isAutoScrollingRef = useRef(false);

  // Filter out any invalid messages
  const validMessages = messages.filter((msg) => {
    if (!msg || typeof msg !== "object") {
      console.warn("Invalid message found:", msg);
      return false;
    }
    return true;
  });

  // Handle scroll events for infinite scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Ignore scroll events when auto-scroll is active
      if (isAutoScrollingRef.current) {
        console.log(
          "🔄 [SCROLL-STATE] Ignoring scroll event - auto-scroll active"
        );
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = container;

      // Check if user has scrolled up (not at bottom)
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
      const wasScrolledUp = userHasScrolledUpRef.current;
      userHasScrolledUpRef.current = !isAtBottom;

      // Log scroll state changes
      if (wasScrolledUp !== userHasScrolledUpRef.current) {
        console.log("🔄 [SCROLL-STATE] User scroll state changed:", {
          wasScrolledUp,
          isNowScrolledUp: userHasScrolledUpRef.current,
          scrollTop,
          scrollHeight,
          clientHeight,
          isAtBottom,
        });
      }

      // Load more messages when scrolling to top (with debouncing)
      if (scrollTop < 100 && hasMore && !isLoadingMore && onLoadMore) {
        // Clear existing timeout
        if (loadMoreTimeoutRef.current) {
          clearTimeout(loadMoreTimeoutRef.current);
        }

        // Set new timeout to debounce the load more call
        loadMoreTimeoutRef.current = setTimeout(() => {
          onLoadMore();
        }, 150);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
    };
  }, [hasMore, isLoadingMore, onLoadMore]);

  // Preserve scroll position when loading older messages
  useEffect(() => {
    const container = containerRef.current;
    if (!container || isLoadingMore) return;

    const currentMessageCount = validMessages.length;
    const isNewMessage = currentMessageCount > previousMessageCountRef.current;

    if (isNewMessage && userHasScrolledUpRef.current) {
      // User was scrolled up and new messages were loaded
      // Preserve their scroll position relative to the new content
      const newScrollHeight = container.scrollHeight;
      const scrollHeightDifference =
        newScrollHeight - previousScrollHeightRef.current;

      if (scrollHeightDifference > 0) {
        container.scrollTop += scrollHeightDifference;
      }
    }

    previousScrollHeightRef.current = container.scrollHeight;
    previousMessageCountRef.current = currentMessageCount;
  }, [validMessages.length, isLoadingMore]);

  // Auto-scroll to bottom when messages change or thinking state changes
  useEffect(() => {
    const scrollToBottom = () => {
      if (containerRef.current) {
        console.log("🔄 [AUTO-SCROLL] Regular scroll triggered");
        isAutoScrollingRef.current = true;
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth",
        });
        // Reset flag after a short delay to allow scroll event to complete
        setTimeout(() => {
          isAutoScrollingRef.current = false;
        }, 100);
      }
    };

    const currentMessageCount = validMessages.length;
    const isNewMessage = currentMessageCount > previousMessageCountRef.current;
    const isFirstLoad = previousMessageCountRef.current === 0;

    // Only autoscroll if:
    // 1. This is the first load (app startup)
    // 2. A new message was added AND user hasn't scrolled up
    // 3. Thinking state changed (AI is responding)
    // 4. Streaming state changed
    if (
      isFirstLoad ||
      (isNewMessage && !userHasScrolledUpRef.current) ||
      isThinking ||
      isStreaming
    ) {
      console.log("🔄 [AUTO-SCROLL] Regular scroll conditions met:", {
        isFirstLoad,
        isNewMessage,
        userHasScrolledUp: userHasScrolledUpRef.current,
        isThinking,
        isStreaming,
      });
      // Small delay to ensure DOM has updated
      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }

    // Update the previous message count
    previousMessageCountRef.current = currentMessageCount;
  }, [validMessages, isThinking, isStreaming]);

  // Initial auto-scroll when messages are first loaded
  useEffect(() => {
    console.log("🔄 [INITIAL-SCROLL] Effect triggered:", {
      validMessagesLength: validMessages.length,
      hasInitialScroll: hasInitialScrollRef.current,
      containerExists: !!containerRef.current,
    });

    if (validMessages.length > 0 && !hasInitialScrollRef.current) {
      console.log(
        "🔄 [INITIAL-SCROLL] Initial messages loaded, scrolling to bottom"
      );
      const scrollToBottom = () => {
        if (containerRef.current) {
          console.log("🔄 [INITIAL-SCROLL] Executing scroll to bottom");
          isAutoScrollingRef.current = true;
          containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: "smooth",
          });
          // Reset flag after a short delay to allow scroll event to complete
          setTimeout(() => {
            isAutoScrollingRef.current = false;
          }, 100);
        } else {
          console.log(
            "🔄 [INITIAL-SCROLL] Container ref is null, cannot scroll"
          );
        }
      };

      // Small delay to ensure DOM has updated
      const timeoutId = setTimeout(() => {
        scrollToBottom();
        hasInitialScrollRef.current = true; // Mark that we've done the initial scroll
        console.log(
          "🔄 [INITIAL-SCROLL] Initial scroll completed, flag set to true"
        );
      }, 150);
      return () => clearTimeout(timeoutId);
    } else {
      console.log("🔄 [INITIAL-SCROLL] Conditions not met:", {
        hasMessages: validMessages.length > 0,
        hasInitialScroll: hasInitialScrollRef.current,
      });
    }
  }, [validMessages.length]);

  // Reset initial scroll flag when messages are cleared (e.g., switching chat sessions)
  useEffect(() => {
    console.log("🔄 [INITIAL-SCROLL] Reset effect triggered:", {
      validMessagesLength: validMessages.length,
      hasInitialScroll: hasInitialScrollRef.current,
    });

    if (validMessages.length === 0) {
      console.log(
        "🔄 [INITIAL-SCROLL] Messages cleared, resetting initial scroll flag"
      );
      hasInitialScrollRef.current = false;
    }
  }, [validMessages.length]);

  // Force scroll when the last message content changes during streaming
  useEffect(() => {
    if (!isStreaming || !containerRef.current || validMessages.length === 0)
      return;

    const lastMessage = validMessages[validMessages.length - 1];
    if (lastMessage && lastMessage.user_id === "assistant") {
      // Force scroll when assistant message content changes during streaming
      if (!userHasScrolledUpRef.current) {
        console.log("🔄 [AUTO-SCROLL] Message content change scroll triggered");
        isAutoScrollingRef.current = true;
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth",
        });
        // Reset flag after a short delay to allow scroll event to complete
        setTimeout(() => {
          isAutoScrollingRef.current = false;
        }, 100);
      }
    }
  }, [
    isStreaming,
    validMessages,
    validMessages.length > 0
      ? validMessages[validMessages.length - 1]?.message
      : null,
  ]);

  // Force scroll when streaming starts
  useEffect(() => {
    if (isStreaming && containerRef.current && !userHasScrolledUpRef.current) {
      console.log("🔄 [AUTO-SCROLL] Streaming start scroll triggered");
      // Immediate scroll when streaming starts
      isAutoScrollingRef.current = true;
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
      // Reset flag after a short delay to allow scroll event to complete
      setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 100);
    }
  }, [isStreaming]);

  // Auto-scroll during streaming to keep growing message visible
  useEffect(() => {
    console.log("🔄 [STREAMING-EFFECT] Effect triggered with dependencies:", {
      isStreaming,
      messagesLength: validMessages.length,
    });

    if (!isStreaming || !containerRef.current) {
      console.log(
        "🔄 [STREAMING-EFFECT] Early return - not streaming or no container"
      );
      return;
    }

    console.log("🔄 [STREAMING-SCROLL] Setting up streaming scroll");

    let scrollInterval: ReturnType<typeof setInterval> | null = null;
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    let animationFrameId: number | null = null;

    const scrollToKeepVisible = () => {
      if (containerRef.current && !userHasScrolledUpRef.current) {
        console.log("🔄 [STREAMING-SCROLL] Interval scroll triggered");
        // Use requestAnimationFrame for smoother scrolling
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        animationFrameId = requestAnimationFrame(() => {
          if (containerRef.current) {
            isAutoScrollingRef.current = true;
            containerRef.current.scrollTo({
              top: containerRef.current.scrollHeight,
              behavior: "smooth",
            });
            // Reset flag after a short delay to allow scroll event to complete
            setTimeout(() => {
              isAutoScrollingRef.current = false;
            }, 100);
          }
        });
      } else {
        console.log("🔄 [STREAMING-SCROLL] Scroll blocked:", {
          hasContainer: !!containerRef.current,
          userHasScrolledUp: userHasScrolledUpRef.current,
        });
      }
    };

    // Immediately scroll when streaming starts
    console.log("🔄 [STREAMING-SCROLL] Initial scroll triggered");
    scrollToKeepVisible();

    // Set up a very frequent interval to scroll every 50ms during streaming
    scrollInterval = setInterval(scrollToKeepVisible, 50);

    // Use MutationObserver to watch for text content changes
    const mutationObserver = new MutationObserver((mutations) => {
      // Check if any mutation involves text content changes
      const hasTextChanges = mutations.some(
        (mutation) =>
          mutation.type === "characterData" ||
          (mutation.type === "childList" && mutation.addedNodes.length > 0) ||
          (mutation.type === "attributes" &&
            mutation.attributeName === "textContent")
      );

      if (hasTextChanges) {
        console.log("🔄 [STREAMING-SCROLL] MutationObserver scroll triggered", {
          mutationsCount: mutations.length,
          mutationTypes: mutations.map((m) => m.type),
        });
        // Immediately scroll on text changes
        scrollToKeepVisible();

        // Also debounce additional scrolls to prevent too frequent scrolling
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(() => {
          console.log("🔄 [STREAMING-SCROLL] Debounced scroll triggered");
          scrollToKeepVisible();
        }, 10);
      }
    });

    // Observe the entire message list for changes
    if (containerRef.current) {
      mutationObserver.observe(containerRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["textContent"],
      });
      console.log("🔄 [STREAMING-SCROLL] MutationObserver set up");
    }

    return () => {
      console.log("🔄 [STREAMING-SCROLL] Cleaning up streaming scroll");
      mutationObserver.disconnect();
      if (scrollInterval) {
        clearInterval(scrollInterval);
      }
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isStreaming, validMessages.length]);

  // Listen for progress updates from the parent component
  useEffect(() => {
    const handleProgressUpdate = (event: CustomEvent) => {
      console.log("🔄 [PROGRESS] Progress update received:", {
        progress: event.detail.progress,
        text: event.detail.text,
      });

      // Handle both progress updates and progress clearing
      if (event.detail.progress !== undefined) {
        setProgress(event.detail.progress);
        setProgressText(event.detail.text || "");
      }
    };

    const handleStreamingUpdate = (event: CustomEvent) => {
      console.log("🔄 [STREAMING-STATE] Streaming state changed:", {
        isStreaming: event.detail.isStreaming,
        text: event.detail.text,
      });
      setIsStreaming(event.detail.isStreaming);
    };

    window.addEventListener(
      "document-analysis-progress",
      handleProgressUpdate as EventListener
    );
    window.addEventListener(
      "message-streaming",
      handleStreamingUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "document-analysis-progress",
        handleProgressUpdate as EventListener
      );
      window.removeEventListener(
        "message-streaming",
        handleStreamingUpdate as EventListener
      );
    };
  }, []);

  // Reset progress and streaming when thinking starts/stops
  useEffect(() => {
    // Only clear progress when thinking stops AND there's no active progress
    // This allows progress to continue during document analysis streaming
    if (!isThinking && progress === null) {
      setProgressText("");
      setIsStreaming(false);
    }
  }, [isThinking, progress]);

  return (
    <div
      css={messageListStyle}
      ref={containerRef}
    >
      {hasMore && (
        <button
          css={loadMoreButtonStyle}
          onClick={onLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? "Loading..." : "Load More Messages"}
        </button>
      )}

      {validMessages.length > 0 ? (
        validMessages.map((msg, index) => {
          const isLastMessage = index === validMessages.length - 1;
          const isAssistantMessage = msg.user_id === "assistant";
          const isEmptyMessage = msg.message === "";
          const shouldShowThinking =
            isEmptyMessage && isThinking && isLastMessage;
          const shouldShowStreaming =
            isAssistantMessage &&
            isStreaming &&
            isLastMessage &&
            !isEmptyMessage;
          const shouldShowProgress =
            isAssistantMessage && isLastMessage && progress !== null;

          // Debug logging for progress display
          if (isLastMessage && isAssistantMessage) {
            console.log("🔄 [MESSAGELIST] Progress display debug:", {
              isLastMessage,
              isAssistantMessage,
              isEmptyMessage,
              isThinking,
              progress,
              shouldShowThinking,
              shouldShowProgress,
              messageLength: msg.message?.length || 0,
            });
          }

          return (
            <div
              key={index}
              css={
                msg.user_id === "user"
                  ? userMessageStyle
                  : shouldShowStreaming
                  ? streamingStyle
                  : assistantMessageStyle
              }
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
                {shouldShowThinking ? (
                  <div css={thinkingStyle}>
                    {progress !== null ? (
                      <div>
                        <div>Document Analysis in Progress</div>
                        <div css={progressBarContainerStyle}>
                          <div
                            css={progressBarStyle}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        {progressText && (
                          <div css={progressTextStyle}>{progressText}</div>
                        )}
                        <div css={progressTextStyle}>{progress}% complete</div>
                      </div>
                    ) : (
                      "Thinking..."
                    )}
                  </div>
                ) : typeof msg.message === "string" ? (
                  <>
                    {formatMessage(msg.message)}
                    {shouldShowProgress && (
                      <div
                        css={css`
                          margin-top: 1rem;
                          padding: 0.75rem;
                          background: rgba(59, 130, 246, 0.1);
                          border-radius: 0.5rem;
                          border: 1px solid rgba(59, 130, 246, 0.2);
                        `}
                      >
                        <div>Document Analysis in Progress</div>
                        <div css={progressBarContainerStyle}>
                          <div
                            css={progressBarStyle}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        {progressText && (
                          <div css={progressTextStyle}>{progressText}</div>
                        )}
                        <div css={progressTextStyle}>{progress}% complete</div>
                      </div>
                    )}
                    {msg.user_id === "user" && onAppendToInput && (
                      <button
                        css={enterButtonStyle}
                        title="Copy to input"
                        onClick={() => onAppendToInput(msg.message)}
                      >
                        <FaArrowDown size={8} />
                      </button>
                    )}
                  </>
                ) : (
                  "[Invalid message object]"
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div css={assistantMessageStyle}>
          <p>
            Welcome to Elara! I'm here to help you with your questions and
            document analysis.
          </p>
          <p>
            <strong>Features:</strong>
          </p>
          <ul>
            <li>💬 Chat with AI about any topic</li>
            <li>📄 Upload and analyze documents (DOCX, PDF, TXT, etc.)</li>
            <li>🔒 Private chat sessions for sensitive conversations</li>
            <li>📚 Access to conversation history and summaries</li>
          </ul>
          <p>
            <strong>Privacy:</strong> This is currently a{" "}
            {isPrivate ? "private" : "public"} chat session.
            {!isPrivate && (
              <span>
                Elara will automatically create memories of important
                information you share. You can always edit/delete them in the
                memories tab in the settings.
              </span>
            )}
          </p>
          <button
            css={css`
              background: #3b82f6;
              color: white;
              border: none;
              padding: 0.5rem 1rem;
              border-radius: 0.5rem;
              cursor: pointer;
              margin-top: 0.5rem;

              &:hover {
                background: #2563eb;
              }
            `}
          >
            Start New Chat
          </button>
        </div>
      )}
    </div>
  );
}
//endregion
