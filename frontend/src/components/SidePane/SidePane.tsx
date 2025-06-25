/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useState } from "react";
import { SettingsDialog } from "../Settings/SettingsDialog";
import { Icon } from "../UI/Icon";
import { ChatHistory } from "./ChatHistory";

interface SidePaneProps {
  onSelectChat: (chatIndex: number) => void;
  selectedChatIndex: number | null;
  onNewChat: () => void;
  onDeleteChat: (chatIndex: number) => void;
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
  background: rgba(255, 255, 255, 0.9);
  color: #374151;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.75rem;
  padding: 0.5rem 0.75rem;
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
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);

  @media (prefers-color-scheme: dark) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
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
  padding: 0.5rem;
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
  display: flex;
  align-items: center;
  justify-content: center;

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
}: SidePaneProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const toggleDrawer = () => {
    const newState = !isOpen;
    setIsOpen(newState);
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
        {/* Toggle Button */}
        <button
          css={toggleButtonStyle}
          onClick={toggleDrawer}
        >
          {isOpen ? "<" : ">"}
        </button>

        {/* Drawer Content */}
        {isOpen && (
          <div css={drawerContentStyle}>
            <button
              css={settingsButtonStyle}
              onClick={openSettingsDialog}
            >
              <Icon
                name="settings"
                size={18}
              />
            </button>
            <div css={drawerHeaderStyle}>
              <h2 css={drawerTitleStyle}>
                <ChatHistory
                  onSelectChat={onSelectChat}
                  selectedChatIndex={selectedChatIndex}
                  onNewChat={onNewChat}
                  onDeleteChat={onDeleteChat}
                />
              </h2>
            </div>
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={closeSettingsDialog}
      />
    </>
  );
}
