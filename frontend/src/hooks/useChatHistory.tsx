import { useState, useCallback } from "react";
import { getChatHistory } from "../api/chatApi";
import type { Message } from "../components/Chat/models";

export const useChatHistory = () => {
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const addMessage = (message: Message) => {
    setChatHistory([...chatHistory, message]);
  };

  const getMessages = useCallback(async (limit: number, offset: number) => {
    setIsLoading(true);
    try {
      const response = await getChatHistory(limit, offset);
      if (offset === 0) {
        // First load - replace all messages and reverse to get newest at bottom
        setChatHistory(response.messages.reverse());
      } else {
        // Load more - append to existing messages
        setChatHistory((prev) => [...prev, ...response.messages]);
      }
      setHasMore(response.has_more);
      setTotal(response.total);
    } catch (error) {
      console.error("Error loading chat history:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(
    async (limit: number) => {
      if (!isLoading && hasMore) {
        await getMessages(limit, chatHistory.length);
      }
    },
    [isLoading, hasMore, chatHistory.length, getMessages]
  );

  return {
    chatHistory,
    addMessage,
    getMessages,
    loadMore,
    isLoading,
    hasMore,
    total,
  };
};
