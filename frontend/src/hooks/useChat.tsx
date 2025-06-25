import { useState } from "react";
import { sendMessageWebSocket } from "../api/chatApi";
import type { Message } from "../components/Chat/models";

export const useChat = (): {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (
    message: string,
    model: string,
    attachments?: File[]
  ) => Promise<void>;
} => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (
    message: string,
    model: string,
    attachments?: File[]
  ) => {
    if (!message.trim()) return;

    console.log("Sending message:", { message, model, attachments });

    setIsLoading(true);

    // Add user message
    const userMessage: Message = {
      user_id: "user",
      message: message,
      created_at: new Date().toISOString(),
      id: "",
      model: model,
      updated_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Add assistant message placeholder
    const assistantMessageId = Date.now().toString();
    const assistantMessage: Message = {
      user_id: "assistant",
      message: "",
      created_at: new Date().toISOString(),
      id: assistantMessageId,
      model: model,
      updated_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      await sendMessageWebSocket(
        message,
        model,
        (chunk: string, done: boolean, error?: string) => {
          if (error) {
            // Update the assistant message with error
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, message: `Error: ${error}` }
                  : msg
              )
            );
          } else if (done) {
            // Mark as complete
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, updated_at: new Date().toISOString() }
                  : msg
              )
            );
          } else {
            // Update with new chunk
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, message: msg.message + chunk }
                  : msg
              )
            );
          }
        }
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                message: `Sorry, there was an error sending your message: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
  };
};
