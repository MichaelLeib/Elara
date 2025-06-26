/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useState, useEffect } from "react";
import { SettingsDialog } from "../Settings/SettingsDialog";
import { FaBars, FaGear } from "react-icons/fa6";
import { ChatHistory } from "./ChatHistory";

interface SidePaneProps {
  onSelectChat: (sessionId: string) => void;
  selectedChatIndex: string | null;
  onNewChat: () => void;
  onDeleteChat: (sessionId: string) => void;
  chatSessions: Array<{
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
  }>;
}

const drawerContainerStyle = css`
  position: relative;
  display: flex;
  flex-direction: column;
  top: 0;
  left: 0;
  height: 100vh;
  width: 48px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-right: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
  z-index: 1000;

  @media (prefers-color-scheme: dark) {
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const drawerOpenStyle = css`
  width: 320px;
`;

const toggleButtonStyle = css`
  position: absolute;
  top: 12px;
  left: 8px;
  z-index: 1001;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  color: #374151;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.75rem;
  padding: 0;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &:hover {
    background: rgba(255, 255, 255, 1);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  }

  @media (prefers-color-scheme: dark) {
    background: rgba(30, 41, 59, 0.9);
    color: #e5e7eb;
    border: 1px solid rgba(255, 255, 255, 0.1);

    &:hover {
      background: rgba(30, 41, 59, 1);
    }
  }
`;

const drawerContentStyle = css`
  padding: 1.5rem;
  height: 100%;
  overflow-y: auto;
  width: 320px;
  min-width: 320px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);

  @media (prefers-color-scheme: dark) {
    background: rgba(15, 23, 42, 0.8);
  }

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.3);
    border-radius: 3px;

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

const drawerHeaderStyle = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
`;

const drawerTitleStyle = css`
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  letter-spacing: -0.025em;

  @media (prefers-color-scheme: dark) {
    color: #f1f5f9;
  }
`;

const settingsButtonStyle = css`
  position: absolute;
  top: 0.75rem;
  right: 3.5rem;
  z-index: 1001;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.75rem;
  cursor: pointer;
  font-size: 1.125rem;
  color: #374151;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &:hover {
    background: rgba(255, 255, 255, 1);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  @media (prefers-color-scheme: dark) {
    background: rgba(30, 41, 59, 0.9);
    color: #e5e7eb;
    border: 1px solid rgba(255, 255, 255, 0.1);

    &:hover {
      background: rgba(30, 41, 59, 1);
    }
  }
`;

export function SidePane({
  onSelectChat,
  selectedChatIndex,
  onNewChat,
  onDeleteChat,
  chatSessions,
}: SidePaneProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Auto-open drawer on large screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1280) {
        setIsOpen(true);
      }
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  };

  const openSettingsDialog = () => {
    setIsSettingsOpen(true);
  };

  const closeSettingsDialog = () => {
    setIsSettingsOpen(false);
  };

  return (
    <>
      <div css={[drawerContainerStyle, isOpen && drawerOpenStyle]}>
        <button
          css={toggleButtonStyle}
          onClick={toggleDrawer}
        >
          <FaBars size={16} />
        </button>

        <button
          css={settingsButtonStyle}
          onClick={openSettingsDialog}
        >
          <FaGear size={16} />
        </button>

        {isOpen && (
          <div css={drawerContentStyle}>
            <div css={drawerHeaderStyle}>
              <h2 css={drawerTitleStyle}>Chat History</h2>
            </div>

            <ChatHistory
              onNewChat={onNewChat}
              onSelectChat={onSelectChat}
              selectedChatIndex={selectedChatIndex}
              onDeleteChat={onDeleteChat}
              chatSessions={chatSessions}
            />
          </div>
        )}
      </div>

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={closeSettingsDialog}
      />
    </>
  );
}
