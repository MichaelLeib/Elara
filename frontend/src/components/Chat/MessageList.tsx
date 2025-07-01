/** @jsxImportSource @emotion/react */
import { useEffect, useRef, useState } from "react";
import type { MessageListProps as OriginalMessageListProps } from "./models";
import dayjs from "dayjs";
import { FaArrowDown, FaStop } from "react-icons/fa";
import {
  messageListStyle,
  userMessageStyle,
  streamingStyle,
  loadMoreButtonStyle,
  progressBarContainerStyle,
  progressBarStyle,
  progressTextStyle,
  lightEffectStyle,
  stopButtonStyle,
  assistantMessageStyle,
  messageTimestampStyle,
  messageModelStyle,
  messageBubbleStyle,
  thinkingStyle,
  enterButtonStyle,
} from "./MessageListStyles.ts";
import { css } from "@emotion/react";
import { AnimatedProgressText } from "./DocAnalysisProgress.tsx";
import { FileList } from "./FileList.tsx";
import { AnimatedThinking } from "./AnimatedThinking.tsx";
import { MemoryNotification } from "./MemoryNotification.tsx";
import SourcePills from "../UI/SourcePills";

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
  const [memoryNotification, setMemoryNotification] = useState<{
    isVisible: boolean;
    message: string;
    savedItems: Array<{
      key: string;
      value: string;
      action: string;
      reason: string;
    }>;
  }>({
    isVisible: false,
    message: "",
    savedItems: [],
  });
  const [isStopping, setIsStopping] = useState(false);
  const [webSearchStatus, setWebSearchStatus] = useState<{
    isSearching: boolean;
    searchTerms?: string;
  }>({
    isSearching: false,
  });
  const isAutoScrollingRef = useRef(false);

  // Filter out any invalid messages and sort in chronological order (oldest first)
  const validMessages = messages
    .filter((msg) => {
      if (!msg || typeof msg !== "object") {
        console.warn("Invalid message found:", msg);
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort by created_at timestamp in ascending order (oldest first)
      try {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateA - dateB;
      } catch (error) {
        console.warn("Error sorting messages by date:", error);
        return 0; // Keep original order if date parsing fails
      }
    });

  // Handle scroll events for infinite scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Ignore scroll events when auto-scroll is active
      if (isAutoScrollingRef.current) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = container;

      // Check if user has scrolled up (not at bottom)
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
      userHasScrolledUpRef.current = !isAtBottom;

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
    // 5. Progress updates (document analysis)
    if (
      isFirstLoad ||
      (isNewMessage && !userHasScrolledUpRef.current) ||
      isThinking ||
      isStreaming ||
      progress !== null
    ) {
      // Small delay to ensure DOM has updated
      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }

    // Update the previous message count
    previousMessageCountRef.current = currentMessageCount;
  }, [validMessages, isThinking, isStreaming, progress]);

  // Initial auto-scroll when messages are first loaded
  useEffect(() => {
    if (validMessages.length > 0 && !hasInitialScrollRef.current) {
      const scrollToBottom = () => {
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
      };

      // Small delay to ensure DOM has updated
      const timeoutId = setTimeout(() => {
        scrollToBottom();
        hasInitialScrollRef.current = true; // Mark that we've done the initial scroll
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [validMessages.length]);

  // Reset initial scroll flag when messages are cleared (e.g., switching chat sessions)
  useEffect(() => {
    if (validMessages.length === 0) {
      hasInitialScrollRef.current = false;
    }
  }, [validMessages.length]);

  // Extract last message content for dependency array
  const lastMessageContent =
    validMessages.length > 0
      ? validMessages[validMessages.length - 1]?.message
      : null;

  // Force scroll when the last message content changes during streaming
  useEffect(() => {
    if (!isStreaming || !containerRef.current || validMessages.length === 0)
      return;

    const lastMessage = validMessages[validMessages.length - 1];
    if (lastMessage && lastMessage.user_id === "assistant") {
      // Force scroll when assistant message content changes during streaming
      if (!userHasScrolledUpRef.current) {
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
  }, [isStreaming, validMessages, lastMessageContent]);

  // Force scroll when streaming starts
  useEffect(() => {
    if (isStreaming && containerRef.current && !userHasScrolledUpRef.current) {
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
    if (!isStreaming || !containerRef.current) {
      return;
    }

    let scrollInterval: ReturnType<typeof setInterval> | null = null;
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    let animationFrameId: number | null = null;

    const scrollToKeepVisible = () => {
      if (containerRef.current && !userHasScrolledUpRef.current) {
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
    }

    return () => {
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
      // Handle both progress updates and progress clearing
      if (event.detail.progress !== undefined) {
        // Ignore keepalive messages (progress=1) to avoid interfering with real progress
        if (
          event.detail.progress === 1 &&
          event.detail.text?.includes("Processing... (")
        ) {
          return;
        }

        setProgress(event.detail.progress);
        // Only set text if it's not null (null means clear the text)
        if (event.detail.text !== null) {
          setProgressText(event.detail.text || "");
        } else {
          setProgressText("");
        }

        // Reset stopping state when progress is cleared (analysis complete)
        if (event.detail.progress === null) {
          setIsStopping(false);
        }
      }
    };

    const handleStreamingUpdate = (event: CustomEvent) => {
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
    // Clear progress when thinking stops (this handles error cases)
    if (!isThinking) {
      setProgressText("");
      setIsStreaming(false);
      setIsStopping(false); // Reset stopping state when thinking stops
      setWebSearchStatus({ isSearching: false }); // Clear web search status when thinking stops
      // Note: progress state is cleared by the event listener when document-analysis-progress event is dispatched with progress: null
    }
  }, [isThinking]);

  // Handle streaming state updates
  useEffect(() => {
    const handleStreamingUpdate = (event: CustomEvent) => {
      setIsStreaming(event.detail.isStreaming);
    };

    window.addEventListener(
      "message-streaming",
      handleStreamingUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        "message-streaming",
        handleStreamingUpdate as EventListener
      );
    };
  }, []);

  // Handle web search notifications
  useEffect(() => {
    const handleWebSearch = (event: CustomEvent) => {
      const { search_terms, done } = event.detail;

      if (done) {
        // Web search completed
        setWebSearchStatus({ isSearching: false });
      } else {
        // Web search started
        setWebSearchStatus({
          isSearching: true,
          searchTerms: search_terms,
        });
      }
    };

    window.addEventListener(
      "web-search-performed",
      handleWebSearch as EventListener
    );
    return () => {
      window.removeEventListener(
        "web-search-performed",
        handleWebSearch as EventListener
      );
    };
  }, []);

  // Handle memory update notifications
  useEffect(() => {
    const handleMemoryUpdate = (event: CustomEvent) => {
      const { content, saved_items } = event.detail;
      setMemoryNotification({
        isVisible: true,
        message: content,
        savedItems: saved_items || [],
      });
    };

    window.addEventListener(
      "memory-updated",
      handleMemoryUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        "memory-updated",
        handleMemoryUpdate as EventListener
      );
    };
  }, []);

  // Debug web search status changes
  useEffect(() => {
    console.log("🔍 [MESSAGELIST] Web search status changed:", webSearchStatus);
  }, [webSearchStatus]);

  const handleMemoryNotificationClose = () => {
    setMemoryNotification((prev) => ({ ...prev, isVisible: false }));
  };

  const handleStopAnalysis = () => {
    console.log("🔄 [STOP] Stop analysis requested");
    console.log("🔄 [STOP] Current state:", {
      progress,
      isThinking,
      isStreaming,
      validMessagesLength: validMessages.length,
    });

    // Set stopping state
    setIsStopping(true);
    setProgressText("Stopping analysis...");

    // Dispatch a custom event that the parent component can listen to
    window.dispatchEvent(
      new CustomEvent("stop-analysis", {
        detail: { timestamp: Date.now() },
      })
    );
  };

  return (
    <>
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
          <>
            {validMessages.map((msg, index) => {
              const isLastMessage = index === validMessages.length - 1;
              const isAssistantMessage = msg.user_id === "assistant";
              const isEmptyMessage = msg.message === "";
              const shouldShowThinking =
                isEmptyMessage && isThinking && isLastMessage;
              const shouldShowSearching =
                webSearchStatus.isSearching && isThinking && isLastMessage;
              const shouldShowStreaming =
                isAssistantMessage &&
                isStreaming &&
                isLastMessage &&
                !isEmptyMessage;
              const shouldShowProgress =
                isAssistantMessage && isLastMessage && progress !== null;

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
                    {shouldShowThinking || shouldShowSearching ? (
                      <div css={thinkingStyle}>
                        {progress !== null ? (
                          <div
                            style={{ position: "relative", overflow: "hidden" }}
                          >
                            <div>Document Analysis in Progress...</div>
                            <div css={progressBarContainerStyle}>
                              <div
                                css={progressBarStyle}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            {progressText && (
                              <AnimatedProgressText
                                key={progressText}
                                text={progressText}
                              />
                            )}
                            <div css={progressTextStyle}>
                              {progress}% complete
                            </div>
                            <div css={lightEffectStyle} />
                            <button
                              css={stopButtonStyle}
                              title={
                                isStopping ? "Stopping..." : "Stop analysis"
                              }
                              onClick={handleStopAnalysis}
                              disabled={isStopping}
                            >
                              {isStopping ? (
                                <>
                                  <div
                                    css={css`
                                      width: 12px;
                                      height: 12px;
                                      border: 2px solid rgba(255, 255, 255, 0.3);
                                      border-top: 2px solid white;
                                      border-radius: 50%;
                                      animation: spin 1s linear infinite;
                                      margin-right: 6px;

                                      @keyframes spin {
                                        0% {
                                          transform: rotate(0deg);
                                        }
                                        100% {
                                          transform: rotate(360deg);
                                        }
                                      }
                                    `}
                                  />
                                  Stopping...
                                </>
                              ) : (
                                <>
                                  <FaStop size={12} />
                                  Stop
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <AnimatedThinking
                            mode={
                              webSearchStatus.isSearching
                                ? "searching"
                                : "thinking"
                            }
                            searchTerms={webSearchStatus.searchTerms}
                          />
                        )}
                      </div>
                    ) : typeof msg.message === "string" ? (
                      <div>
                        {formatMessage(msg.message)}
                        {msg.files && <FileList files={msg.files} />}
                        {msg.web_search_sources &&
                          msg.web_search_sources.length > 0 && (
                            <SourcePills sources={msg.web_search_sources} />
                          )}
                        {shouldShowProgress && (
                          <div
                            css={css`
                              margin-top: 1rem;
                              padding: 0.75rem;
                              background: rgba(59, 130, 246, 0.1);
                              border-radius: 0.5rem;
                              border: 1px solid rgba(59, 130, 246, 0.2);
                              height: 100%;
                              position: relative;
                              overflow: hidden;
                            `}
                          >
                            <div>Analysis in Progress...</div>
                            <div css={progressBarContainerStyle}>
                              <div
                                css={progressBarStyle}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            {progressText && (
                              <AnimatedProgressText
                                key={progressText}
                                text={progressText}
                              />
                            )}
                            <div css={progressTextStyle}>
                              {progress}% complete
                            </div>
                            <div css={lightEffectStyle} />
                            <button
                              css={stopButtonStyle}
                              title={
                                isStopping ? "Stopping..." : "Stop analysis"
                              }
                              onClick={handleStopAnalysis}
                              disabled={isStopping}
                            >
                              {isStopping ? (
                                <>
                                  <div
                                    css={css`
                                      width: 12px;
                                      height: 12px;
                                      border: 2px solid rgba(255, 255, 255, 0.3);
                                      border-top: 2px solid white;
                                      border-radius: 50%;
                                      animation: spin 1s linear infinite;
                                      margin-right: 6px;

                                      @keyframes spin {
                                        0% {
                                          transform: rotate(0deg);
                                        }
                                        100% {
                                          transform: rotate(360deg);
                                        }
                                      }
                                    `}
                                  />
                                  Stopping...
                                </>
                              ) : (
                                <>
                                  <FaStop size={12} />
                                  Stop
                                </>
                              )}
                            </button>
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
                      </div>
                    ) : (
                      "[Invalid message object]"
                    )}
                  </div>
                </div>
              );
            })}
          </>
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
          </div>
        )}
      </div>

      <MemoryNotification
        isVisible={memoryNotification.isVisible}
        message={memoryNotification.message}
        savedItems={memoryNotification.savedItems}
        onClose={handleMemoryNotificationClose}
      />
    </>
  );
}
//endregion
