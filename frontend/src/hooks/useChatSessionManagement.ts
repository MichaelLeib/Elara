import { useCallback, useEffect, useState } from "react";
import {
  createChatSession,
  createPrivateChatSession,
  deleteChatSession,
  getChatSessions,
} from "../api/chatApi";

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  is_private?: boolean;
  model?: string;
}

interface UseChatSessionManagementReturn {
  selectedSessionId: string | null;
  chatSessions: ChatSession[];
  isLoading: boolean;
  showConfirmDialog: boolean;
  chatToDelete: string | null;
  setSelectedSessionId: (id: string | null) => void;
  handleSelectChat: (sessionId: string) => void;
  handleNewChat: () => Promise<void>;
  handleNewPrivateChat: () => Promise<void>;
  handleDeleteChat: (sessionId: string) => void;
  handleDeleteConfirm: () => Promise<void>;
  setShowConfirmDialog: (show: boolean) => void;
  setChatToDelete: (id: string | null) => void;
}

export const useChatSessionManagement = (): UseChatSessionManagementReturn => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  // Load chat sessions on mount
  useEffect(() => {
    const loadChatSessions = async () => {
      try {
        const response = await getChatSessions();
        setChatSessions(response.sessions);
        // Select the first session if none is selected
        if (!selectedSessionId && response.sessions.length > 0) {
          setSelectedSessionId(response.sessions[0].id);
        }
      } catch (error) {
        console.error("Error loading chat sessions:", error);
      }
    };
    loadChatSessions();
  }, [selectedSessionId]);

  const handleSelectChat = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
  }, []);

  const handleNewChat = useCallback(async () => {
    try {
      console.log("Creating new chat with title: New Chat");
      const response = await createChatSession("New Chat");
      console.log("New chat created:", response.session);
      const newSession = response.session;
      setChatSessions((prev) => [newSession, ...prev]);
      setSelectedSessionId(newSession.id);
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  }, []);

  const handleNewPrivateChat = useCallback(async () => {
    try {
      const response = await createPrivateChatSession("Private Chat");
      const newSession = response.session;
      setChatSessions((prev) => [newSession, ...prev]);
      setSelectedSessionId(newSession.id);
    } catch (error) {
      console.error("Error creating new private chat:", error);
    }
  }, []);

  const handleDeleteChat = useCallback((sessionId: string) => {
    setChatToDelete(sessionId);
    setShowConfirmDialog(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (chatToDelete === null) return;

    try {
      await deleteChatSession(chatToDelete);
      setChatSessions((prev) =>
        prev.filter((session) => session.id !== chatToDelete)
      );

      // If we deleted the currently selected chat, select the first available one
      if (selectedSessionId === chatToDelete) {
        const remainingSessions = chatSessions.filter(
          (session) => session.id !== chatToDelete
        );
        if (remainingSessions.length > 0) {
          setSelectedSessionId(remainingSessions[0].id);
        } else {
          setSelectedSessionId(null);
        }
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    } finally {
      setShowConfirmDialog(false);
      setChatToDelete(null);
    }
  }, [chatToDelete, selectedSessionId, chatSessions]);

  return {
    selectedSessionId,
    chatSessions,
    isLoading,
    showConfirmDialog,
    chatToDelete,
    setSelectedSessionId,
    handleSelectChat,
    handleNewChat,
    handleNewPrivateChat,
    handleDeleteChat,
    handleDeleteConfirm,
    setShowConfirmDialog,
    setChatToDelete,
  };
};
