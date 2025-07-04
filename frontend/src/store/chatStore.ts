import { create } from "zustand";
import {
  createChatSession,
  createPrivateChatSession,
  deleteChatSession,
  getChatSessionMessages,
  getChatSessions,
  sendMessageWebSocket,
} from "../api/chatApi";
import type { Message } from "../components/Chat/models";

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  is_private?: boolean;
  model?: string;
}

interface ChatState {
  // Chat sessions
  selectedSessionId: string | null;
  chatSessions: ChatSession[];
  showConfirmDialog: boolean;
  chatToDelete: string | null;

  // Messages
  messages: Message[];
  isLoadingMessages: boolean;
  hasMore: boolean;
  total: number;

  // Message sending
  isMessageLoading: boolean;
  currentAssistantMessageId: string | null;

  // Actions
  setSelectedSessionId: (id: string | null) => void;
  handleSelectChat: (sessionId: string) => void;
  handleNewChat: () => Promise<void>;
  handleNewPrivateChat: () => Promise<void>;
  handleDeleteChat: (sessionId: string) => void;
  handleDeleteConfirm: () => Promise<void>;
  setShowConfirmDialog: (show: boolean) => void;
  setChatToDelete: (id: string | null) => void;

  // Message actions
  loadMessages: (
    sessionId: string,
    settings: { message_limit: number; message_offset: number },
    limit?: number,
    offset?: number
  ) => Promise<void>;
  loadMore: (
    sessionId: string,
    settings: { message_limit: number; message_offset: number },
    limit?: number
  ) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessage: (
    messageId: string,
    updates:
      | Partial<Message>
      | ((prevMsg: Message | undefined) => Partial<Message>)
  ) => void;
  clearMessages: () => void;
  handleSendMessage: (
    message: string,
    model: string,
    attachments?: File[]
  ) => Promise<void>;

  // Initialize
  initialize: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  selectedSessionId: null,
  chatSessions: [],
  showConfirmDialog: false,
  chatToDelete: null,
  messages: [],
  isLoadingMessages: false,
  hasMore: true,
  total: 0,
  isMessageLoading: false,
  currentAssistantMessageId: null,

  // Chat session actions
  setSelectedSessionId: (id: string | null) => set({ selectedSessionId: id }),

  handleSelectChat: (sessionId: string) =>
    set({ selectedSessionId: sessionId }),

  handleNewChat: async () => {
    try {
      console.log("Creating new chat with title: New Chat");
      const response = await createChatSession("New Chat");
      console.log("New chat created:", response.session);
      const newSession = response.session;
      set((state) => ({
        chatSessions: [newSession, ...state.chatSessions],
        selectedSessionId: newSession.id,
      }));
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  },

  handleNewPrivateChat: async () => {
    try {
      const response = await createPrivateChatSession("Private Chat");
      const newSession = response.session;
      set((state) => ({
        chatSessions: [newSession, ...state.chatSessions],
        selectedSessionId: newSession.id,
      }));
    } catch (error) {
      console.error("Error creating new private chat:", error);
    }
  },

  handleDeleteChat: (sessionId: string) => {
    set({ chatToDelete: sessionId, showConfirmDialog: true });
  },

  handleDeleteConfirm: async () => {
    const { chatToDelete, selectedSessionId, chatSessions } = get();
    if (chatToDelete === null) return;

    try {
      await deleteChatSession(chatToDelete);
      const remainingSessions = chatSessions.filter(
        (session) => session.id !== chatToDelete
      );

      set({
        chatSessions: remainingSessions,
        showConfirmDialog: false,
        chatToDelete: null,
      });

      // If we deleted the currently selected chat, select the first available one
      if (selectedSessionId === chatToDelete) {
        if (remainingSessions.length > 0) {
          set({ selectedSessionId: remainingSessions[0].id });
        } else {
          set({ selectedSessionId: null });
        }
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      set({ showConfirmDialog: false, chatToDelete: null });
    }
  },

  setShowConfirmDialog: (show: boolean) => set({ showConfirmDialog: show }),
  setChatToDelete: (id: string | null) => set({ chatToDelete: id }),

  // Message actions
  loadMessages: async (
    sessionId: string,
    settings: { message_limit: number; message_offset: number },
    limit?: number,
    offset?: number
  ) => {
    set({ isLoadingMessages: true });
    try {
      const response = await getChatSessionMessages(
        sessionId,
        settings,
        limit,
        offset
      );
      if (offset === 0) {
        // First load - replace all messages (most recent first)
        set({
          messages: response.messages,
          hasMore: response.has_more,
          total: response.total,
        });
      } else {
        // Load more - append older messages (since they come in most recent first order)
        set((state) => ({
          messages: [...state.messages, ...response.messages],
          hasMore: response.has_more,
          total: response.total,
        }));
      }
    } catch (error) {
      console.error("Error loading chat session messages:", error);
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  loadMore: async (
    sessionId: string,
    settings: { message_limit: number; message_offset: number },
    limit?: number
  ) => {
    const { isLoadingMessages, hasMore, messages } = get();
    if (!isLoadingMessages && hasMore) {
      await get().loadMessages(sessionId, settings, limit, messages.length);
    }
  },

  addMessage: (message: Message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  updateMessage: (
    messageId: string,
    updates:
      | Partial<Message>
      | ((prevMsg: Message | undefined) => Partial<Message>)
  ) => {
    set((state) => ({
      messages: state.messages.map((msg) => {
        if (msg.id === messageId) {
          const updateObj =
            typeof updates === "function" ? updates(msg) : updates;
          return { ...msg, ...updateObj } as Message;
        }
        return msg;
      }),
    }));
  },

  clearMessages: () => {
    set({ messages: [], hasMore: true, total: 0 });
  },

  handleSendMessage: async (
    message: string,
    model: string,
    attachments?: File[]
  ) => {
    if (!message.trim() && (!attachments || attachments.length === 0)) {
      return;
    }

    set({ isMessageLoading: true });

    const { selectedSessionId, chatSessions, addMessage, updateMessage } =
      get();

    // Create a new chat session if none exists
    let currentSessionId = selectedSessionId;
    if (!currentSessionId) {
      try {
        const response = await createChatSession("New Chat");
        currentSessionId = response.session.id;
        set((state) => ({
          chatSessions: [response.session, ...state.chatSessions],
          selectedSessionId: response.session.id,
        }));
      } catch (error) {
        console.error("Failed to create chat session:", error);
        set({ isMessageLoading: false });
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
    set({ currentAssistantMessageId: assistantMessageId });

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

            set({ isMessageLoading: false });
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

            set({ isMessageLoading: false });
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
                  chunk.match(
                    /^(Processing|Analyzing|Validating|Extracting|Combining|Preparing|Document|chunk|Synthesizing|Streaming|complete)/i
                  ) ||
                  (chunk.length < 50 &&
                    chunk.match(
                      /^(Processing|Analyzing|Validating|Extracting|Combining|Preparing|Document|chunk|Synthesizing|Streaming|complete)/i
                    )) ||
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

      set({ isMessageLoading: false });
    }
  },

  // Initialize
  initialize: async () => {
    try {
      const response = await getChatSessions();
      const { selectedSessionId } = get();
      set({ chatSessions: response.sessions });

      // Select the first session if none is selected
      if (!selectedSessionId && response.sessions.length > 0) {
        set({ selectedSessionId: response.sessions[0].id });
      }
    } catch (error) {
      console.error("Error loading chat sessions:", error);
    }
  },
}));
