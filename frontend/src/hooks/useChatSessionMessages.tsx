import { useState, useCallback } from "react";
import { getChatSessionMessages } from "../api/chatApi";
import type { Message } from "../components/Chat/models";

export const useChatSessionMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const loadMessages = useCallback(
    async (
      chatIndex: number,
      settings: { message_limit: number; message_offset: number },
      limit?: number,
      offset?: number
    ) => {
      setIsLoading(true);
      try {
        const response = await getChatSessionMessages(
          chatIndex,
          settings,
          limit,
          offset
        );
        if (offset === 0) {
          // First load - replace all messages
          setMessages(response.messages);
        } else {
          // Load more - append to existing messages
          setMessages((prev) => [...prev, ...response.messages]);
        }
        setHasMore(response.has_more);
        setTotal(response.total);
      } catch (error) {
        console.error("Error loading chat session messages:", error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const loadMore = useCallback(
    async (
      chatIndex: number,
      settings: { message_limit: number; message_offset: number },
      limit?: number
    ) => {
      if (!isLoading && hasMore) {
        await loadMessages(chatIndex, settings, limit, messages.length);
      }
    },
    [isLoading, hasMore, messages.length, loadMessages]
  );

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessage = useCallback(
    (
      messageId: string,
      updates:
        | Partial<Message>
        | ((prevMsg: Message | undefined) => Partial<Message>)
    ) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            const updateObj =
              typeof updates === "function" ? updates(msg) : updates;
            return { ...msg, ...updateObj };
          }
          return msg;
        })
      );
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setHasMore(true);
    setTotal(0);
  }, []);

  return {
    messages,
    addMessage,
    updateMessage,
    loadMessages,
    loadMore,
    isLoading,
    hasMore,
    total,
    clearMessages,
  };
};
