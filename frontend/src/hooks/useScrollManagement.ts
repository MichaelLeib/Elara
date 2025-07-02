import { useCallback, useEffect, useRef } from "react";
import type { Message } from "../components/Chat/models";

interface UseScrollManagementProps {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore?: () => void;
  messages: Message[];
  isThinking: boolean;
  isStreaming: boolean;
  progress: number | null;
}

interface UseScrollManagementReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  userHasScrolledUpRef: React.MutableRefObject<boolean>;
  isAutoScrollingRef: React.MutableRefObject<boolean>;
  scrollToBottom: () => void;
}

export const useScrollManagement = ({
  hasMore,
  isLoadingMore,
  onLoadMore,
  messages,
  isThinking,
  isStreaming,
  progress,
}: UseScrollManagementProps): UseScrollManagementReturn => {
  const containerRef = useRef<HTMLDivElement>(null);
  const userHasScrolledUpRef = useRef(false);
  const previousMessageCountRef = useRef(0);
  const previousScrollHeightRef = useRef(0);
  const loadMoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialScrollRef = useRef(false);
  const isAutoScrollingRef = useRef(false);
  const lastMessageContentRef = useRef<string>("");

  const scrollToBottom = useCallback(() => {
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
  }, []);

  // Handle scroll events for infinite scroll and user scroll detection
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

    const currentMessageCount = messages.length;
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
  }, [messages.length, isLoadingMore]);

  // Auto-scroll to bottom when messages change or thinking state changes
  useEffect(() => {
    const currentMessageCount = messages.length;
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
  }, [messages, isThinking, isStreaming, progress, scrollToBottom]);

  // Initial auto-scroll when messages are first loaded
  useEffect(() => {
    if (messages.length > 0 && !hasInitialScrollRef.current) {
      // Small delay to ensure DOM has updated
      const timeoutId = setTimeout(() => {
        scrollToBottom();
        hasInitialScrollRef.current = true; // Mark that we've done the initial scroll
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, scrollToBottom]);

  // Reset initial scroll flag when messages are cleared (e.g., switching chat sessions)
  useEffect(() => {
    if (messages.length === 0) {
      hasInitialScrollRef.current = false;
    }
  }, [messages.length]);

  // Enhanced auto-scroll during streaming to keep growing message visible
  useEffect(() => {
    if (!isStreaming || !containerRef.current || messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.user_id !== "assistant") {
      return;
    }

    const currentContent = lastMessage.message || "";

    // Check if content has changed (for streaming updates)
    if (currentContent !== lastMessageContentRef.current) {
      lastMessageContentRef.current = currentContent;

      // Only scroll if user hasn't scrolled up
      if (!userHasScrolledUpRef.current) {
        // Use requestAnimationFrame for smoother scrolling
        requestAnimationFrame(() => {
          if (containerRef.current) {
            isAutoScrollingRef.current = true;
            containerRef.current.scrollTo({
              top: containerRef.current.scrollHeight,
              behavior: "smooth",
            });
            // Reset flag after a short delay
            setTimeout(() => {
              isAutoScrollingRef.current = false;
            }, 100);
          }
        });
      }
    }
  }, [isStreaming, messages]);

  // Force scroll when streaming starts
  useEffect(() => {
    if (isStreaming && containerRef.current && !userHasScrolledUpRef.current) {
      // Immediate scroll when streaming starts
      scrollToBottom();
    }
  }, [isStreaming, scrollToBottom]);

  // Auto-scroll during streaming with MutationObserver for real-time content changes
  useEffect(() => {
    if (!isStreaming || !containerRef.current) {
      return;
    }

    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

    const scrollToKeepVisible = () => {
      if (containerRef.current && !userHasScrolledUpRef.current) {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            isAutoScrollingRef.current = true;
            containerRef.current.scrollTo({
              top: containerRef.current.scrollHeight,
              behavior: "smooth",
            });
            setTimeout(() => {
              isAutoScrollingRef.current = false;
            }, 100);
          }
        });
      }
    };

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
        // Immediately scroll on text changes
        scrollToKeepVisible();

        // Also debounce additional scrolls to prevent too frequent scrolling
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(() => {
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
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [isStreaming, messages.length]);

  return {
    containerRef,
    userHasScrolledUpRef,
    isAutoScrollingRef,
    scrollToBottom,
  };
};
