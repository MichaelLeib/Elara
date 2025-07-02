import { useCallback, useRef, useState } from "react";
import { sendMessageWebSocket } from "../api/chatApi";
import type { Message } from "../components/Chat/models";

interface UseMessageSendingProps {
  selectedSessionId: string | null;
  chatSessions: Array<{
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
    is_private?: boolean;
    model?: string;
  }>;
  addMessage: (message: Message) => void;
  updateMessage: (
    messageId: string,
    updates:
      | Partial<Message>
      | ((prevMsg: Message | undefined) => Partial<Message>)
  ) => void;
  clearMessages: () => void;
  createChatSession: (title: string) => Promise<{ session: { id: string } }>;
}

interface UseMessageSendingReturn {
  isLoading: boolean;
  currentAssistantMessageIdRef: React.MutableRefObject<string | null>;
  handleSendMessage: (
    message: string,
    model: string,
    attachments?: File[]
  ) => Promise<void>;
}

export const useMessageSending = ({
  selectedSessionId,
  chatSessions,
  addMessage,
  updateMessage,
  clearMessages,
  createChatSession,
}: UseMessageSendingProps): UseMessageSendingReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const currentAssistantMessageIdRef = useRef<string | null>(null);

  const handleSendMessage = useCallback(
    async (message: string, model: string, attachments?: File[]) => {
      if (!message.trim() && (!attachments || attachments.length === 0)) {
        return;
      }

      setIsLoading(true);

      // Create a new chat session if none exists
      let currentSessionId = selectedSessionId;
      if (!currentSessionId) {
        try {
          const response = await createChatSession("New Chat");
          currentSessionId = response.session.id;
          // The session will be selected by the parent component
        } catch (error) {
          console.error("Failed to create chat session:", error);
          setIsLoading(false);
          return;
        }
      }

      // Find the current session to determine if it's private
      const currentSession = chatSessions.find(
        (session) => session.id === currentSessionId
      );
      const isPrivate = currentSession?.is_private || false;

      // Add user message
      const userMessage: Message = {
        user_id: "user",
        message: message,
        created_at: new Date().toISOString(),
        id: `user-${Date.now()}-${Math.random()}`,
        model: model,
        updated_at: new Date().toISOString(),
        files: attachments?.map((file) => ({
          filename: file.name,
          size: file.size,
          type: file.type,
        })),
      };

      addMessage(userMessage);

      // Create assistant message placeholder
      const assistantMessageId = `assistant-${Date.now()}-${Math.random()}`;
      currentAssistantMessageIdRef.current = assistantMessageId;
      const assistantMessage: Message = {
        user_id: "assistant",
        message: "",
        created_at: new Date().toISOString(),
        id: assistantMessageId,
        model: model,
        updated_at: new Date().toISOString(),
      };

      addMessage(assistantMessage);

      try {
        await sendMessageWebSocket(
          message,
          model,
          currentSessionId,
          isPrivate,
          attachments,
          (chunk: string, done: boolean, error?: string, progress?: number) => {
            if (error) {
              // Update the assistant message with error
              updateMessage(assistantMessageId, {
                message: `Error: ${error}`,
              });

              // Stop streaming indicator
              window.dispatchEvent(
                new CustomEvent("message-streaming", {
                  detail: { isStreaming: false },
                })
              );

              // Clear any progress indicators
              window.dispatchEvent(
                new CustomEvent("document-analysis-progress", {
                  detail: { progress: null, text: null },
                })
              );

              setIsLoading(false);
            } else if (done) {
              // Message is complete
              window.dispatchEvent(
                new CustomEvent("message-streaming", {
                  detail: { isStreaming: false },
                })
              );

              // Clear any progress indicators
              window.dispatchEvent(
                new CustomEvent("document-analysis-progress", {
                  detail: { progress: null, text: null },
                })
              );

              setIsLoading(false);
            } else {
              // Handle progress updates for document analysis
              if (progress !== undefined && progress !== null) {
                // This is a document analysis progress update
                window.dispatchEvent(
                  new CustomEvent("document-analysis-progress", {
                    detail: { progress, text: chunk },
                  })
                );

                // For document analysis progress, ONLY update message content if it's actual analysis content
                // NOT status updates (which are handled by the progress event above)
                // Status updates typically contain phrases like "Processing", "Analyzing", etc.
                const isStatusUpdate =
                  chunk &&
                  (chunk.includes("Processing") ||
                    chunk.includes("Validating") ||
                    chunk.includes("Extracting") ||
                    chunk.includes("Combining") ||
                    chunk.includes("Preparing") ||
                    chunk.includes("Document") ||
                    chunk.includes("chunk") ||
                    chunk.includes("Synthesizing") ||
                    chunk.includes("Streaming") ||
                    chunk.includes("complete") ||
                    // More specific status patterns that are clearly not content
                    chunk.match(
                      /^(Processing|Analyzing|Validating|Extracting|Combining|Preparing|Document|chunk|Synthesizing|Streaming|complete)/i
                    ) ||
                    // Very short messages that are likely status updates
                    (chunk.length < 50 &&
                      chunk.match(
                        /^(Processing|Analyzing|Validating|Extracting|Combining|Preparing|Document|chunk|Synthesizing|Streaming|complete)/i
                      )) ||
                    // Messages that are just status updates without actual content
                    (chunk.length < 100 &&
                      !chunk.includes(".") &&
                      !chunk.includes("!") &&
                      !chunk.includes("?")));

                if (chunk && chunk.trim() && !isStatusUpdate) {
                  // This is actual analysis content, not a status update
                  updateMessage(assistantMessageId, (prevMsg) => ({
                    message: (prevMsg?.message || "") + chunk,
                  }));
                }
              } else {
                // Regular streaming without progress - update with new chunk
                updateMessage(assistantMessageId, (prevMsg) => ({
                  message: (prevMsg?.message || "") + chunk,
                }));

                // Dispatch streaming progress event for regular message streaming
                window.dispatchEvent(
                  new CustomEvent("message-streaming", {
                    detail: { isStreaming: true, text: chunk },
                  })
                );
              }
            }
          }
        );
      } catch (error) {
        console.error("Failed to send message:", error);
        updateMessage(assistantMessageId, {
          message: `Sorry, there was an error sending your message: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });

        // Stop streaming indicator
        window.dispatchEvent(
          new CustomEvent("message-streaming", {
            detail: { isStreaming: false },
          })
        );

        // Clear any progress indicators
        window.dispatchEvent(
          new CustomEvent("document-analysis-progress", {
            detail: { progress: null, text: null },
          })
        );

        setIsLoading(false);
      }
    },
    [
      selectedSessionId,
      chatSessions,
      addMessage,
      updateMessage,
      clearMessages,
      createChatSession,
    ]
  );

  return {
    isLoading,
    currentAssistantMessageIdRef,
    handleSendMessage,
  };
};
