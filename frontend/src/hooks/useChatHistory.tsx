import { useState, useCallback } from "react";
import { getChatHistory } from "../api/chatApi";
import type { Message } from "../components/Chat/models";

export const useChatHistory = () => {
  const [chatHistory, setChatHistory] = useState<Message[]>([]);

  const addMessage = (message: Message) => {
    setChatHistory([...chatHistory, message]);
  };

  const getMessages = useCallback(async () => {
    const messages = await getChatHistory();
    setChatHistory(messages);
  }, []);

  return { chatHistory, addMessage, getMessages };
};
