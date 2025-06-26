/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useState } from "react";
import { updateChatSessionTitle } from "../../api/chatApi";
import { FaPlus, FaPenToSquare, FaTrash, FaComments } from "react-icons/fa6";

interface ChatHistoryProps {
  onNewChat: () => void;
  onSelectChat: (sessionId: string) => void;
  selectedChatIndex: string | null;
  onDeleteChat: (sessionId: string) => void;
  chatSessions: Array<{
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
  }>;
}

const chatHistoryContainerStyle = css`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-right: 1px solid #e2e8f0;
  border-radius: 1.5rem;

  @media (prefers-color-scheme: dark) {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const chatHistoryHeaderStyle = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem 0.5rem 1rem;
  margin: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
  backdrop-filter: blur(8px);
  border-radius: 1rem;

  @media (prefers-color-scheme: dark) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const titleStyle = css`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;

  @media (prefers-color-scheme: dark) {
    color: #f1f5f9;
  }
`;

const newChatButtonStyle = css`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  padding: 0;

  &:hover {
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }
`;

const chatListStyle = css`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.3);
    border-radius: 2px;

    @media (prefers-color-scheme: dark) {
      background: rgba(75, 85, 99, 0.3);
    }
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.5);

    @media (prefers-color-scheme: dark) {
      background: rgba(75, 85, 99, 0.5);
    }
  }
`;

const chatItemStyle = (isSelected: boolean) => css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  min-width: 200px;
  margin-bottom: 0.5rem;
  border-radius: 0.75rem;
  background: ${isSelected
    ? "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
    : "rgba(255, 255, 255, 0.8)"};
  color: ${isSelected ? "white" : "#1f2937"};
  cursor: pointer;
  transition: box-shadow 0.2s ease;
  border: 1px solid ${isSelected ? "transparent" : "#e2e8f0"};
  backdrop-filter: blur(8px);

  @media (prefers-color-scheme: dark) {
    background: ${isSelected
      ? "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
      : "rgba(30, 41, 59, 0.8)"};
    color: ${isSelected ? "white" : "#f1f5f9"};
    border: 1px solid ${isSelected ? "transparent" : "rgba(255, 255, 255, 0.1)"};
  }

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

    @media (prefers-color-scheme: dark) {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    button {
      opacity: 1;
    }
  }
`;

const chatInfoStyle = css`
  flex: 1;
  min-width: 0;
`;

const chatTitleStyle = css`
  display: flex;
  flex-direction: column;
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const chatMessagesNumberStyle = css`
  font-size: 0.7rem;
  opacity: 0.7;
`;

const chatUpdatedAtStyle = css`
  font-size: 0.5rem;
  opacity: 0.7;
`;

const chatActionButtonStyle = (isDelete: boolean) => css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  color: ${isDelete ? "#ef4444" : "#3b82f6"};
  border: none;
  cursor: pointer;
  transition: opacity 0.2s ease;
  opacity: 0;
  margin-left: 0.5rem;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

    @media (prefers-color-scheme: dark) {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
  }
`;

const emptyStateStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  color: #6b7280;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

const emptyStateIconStyle = css`
  width: 3rem;
  height: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const editInputStyle = css`
  width: 94%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.95rem;
  background: white;
  color: #1f2937;

  @media (prefers-color-scheme: dark) {
    background: #374151;
    border-color: #4b5563;
    color: #f1f5f9;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

export function ChatHistory({
  onNewChat,
  onSelectChat,
  selectedChatIndex,
  onDeleteChat,
  chatSessions,
}: ChatHistoryProps) {
  const [editingChatIndex, setEditingChatIndex] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const handleChatClick = (sessionId: string) => {
    onSelectChat(sessionId);
  };

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    onDeleteChat(sessionId);
  };

  const handleEditClick = (
    e: React.MouseEvent,
    sessionId: string,
    title: string
  ) => {
    e.stopPropagation();
    setEditingChatIndex(sessionId);
    setEditingTitle(title);
  };

  const handleSaveTitle = async () => {
    if (editingChatIndex === null) return;

    try {
      await updateChatSessionTitle(editingChatIndex, editingTitle);
      setEditingChatIndex(null);
      setEditingTitle("");
      // Optionally refresh the chat sessions list
      window.dispatchEvent(new CustomEvent("refreshChatList"));
    } catch (error) {
      console.error("Error updating chat title:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingChatIndex(null);
    setEditingTitle("");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <div css={chatHistoryContainerStyle}>
      <div css={chatHistoryHeaderStyle}>
        <h2 css={titleStyle}>Chats</h2>
        <button
          css={newChatButtonStyle}
          onClick={onNewChat}
          title="New Chat"
        >
          <FaPlus size={14} />
        </button>
      </div>

      <div css={chatListStyle}>
        {chatSessions.length === 0 ? (
          <div css={emptyStateStyle}>
            <div css={emptyStateIconStyle}>
              <FaComments size={48} />
            </div>
            <p>No chats yet</p>
            <p>Start a new conversation to see it here</p>
          </div>
        ) : (
          chatSessions.map((chat) => (
            <div
              key={chat.id}
              css={chatItemStyle(selectedChatIndex === chat.id)}
              onClick={() => handleChatClick(chat.id)}
            >
              <div css={chatInfoStyle}>
                {editingChatIndex === chat.id ? (
                  <input
                    css={editInputStyle}
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveTitle();
                      } else if (e.key === "Escape") {
                        handleCancelEdit();
                      }
                    }}
                    onBlur={handleSaveTitle}
                    autoFocus
                  />
                ) : (
                  <div css={chatTitleStyle}>{chat.title}</div>
                )}
                <div css={chatMessagesNumberStyle}>
                  {chat.message_count} messages
                </div>
                <div css={chatUpdatedAtStyle}>
                  {formatDate(chat.updated_at)}
                </div>
              </div>

              <div css={{ display: "flex", alignItems: "center" }}>
                {editingChatIndex !== chat.id && (
                  <>
                    <button
                      css={chatActionButtonStyle(false)}
                      onClick={(e) => handleEditClick(e, chat.id, chat.title)}
                      title="Edit title"
                    >
                      <FaPenToSquare size={12} />
                    </button>
                    <button
                      css={chatActionButtonStyle(true)}
                      onClick={(e) => handleDeleteClick(e, chat.id)}
                      title="Delete chat"
                    >
                      <FaTrash size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
