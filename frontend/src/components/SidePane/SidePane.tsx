/** @jsxImportSource @emotion/react */
import { useState, useEffect } from "react";
import { SettingsDialog } from "../Settings/SettingsDialog";
import { FaBars, FaGear } from "react-icons/fa6";
import { ChatHistory } from "./ChatHistory";
import {
  drawerContainerStyle,
  drawerOpenStyle,
  toggleButtonStyle,
  drawerContentStyle,
  drawerContentOpenStyle,
  drawerHeaderStyle,
  drawerTitleStyle,
  settingsButtonStyle,
  drawerScrollableContentStyle,
} from "./SidePaneStyles";

interface SidePaneProps {
  onSelectChat: (sessionId: string) => void;
  selectedChatIndex: string | null;
  onNewChat: () => void;
  onNewPrivateChat: () => void;
  onDeleteChat: (sessionId: string) => void;
  chatSessions: Array<{
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
  }>;
}

export function SidePane({
  onSelectChat,
  selectedChatIndex,
  onNewChat,
  onNewPrivateChat,
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
      {!isOpen && (
        <button
          css={toggleButtonStyle(isOpen)}
          onClick={toggleDrawer}
        >
          <FaBars size={16} />
        </button>
      )}
      <div css={[drawerContainerStyle, isOpen && drawerOpenStyle]}>
        <div css={[drawerContentStyle, isOpen && drawerContentOpenStyle]}>
          <div css={drawerHeaderStyle}>
            <button
              css={settingsButtonStyle}
              onClick={openSettingsDialog}
            >
              <FaGear size={16} />
            </button>
            <h2 css={drawerTitleStyle}>Chat History</h2>
            <button
              css={toggleButtonStyle(isOpen)}
              onClick={toggleDrawer}
            >
              <FaBars size={16} />
            </button>
          </div>

          <div css={drawerScrollableContentStyle}>
            <ChatHistory
              onNewChat={onNewChat}
              onNewPrivateChat={onNewPrivateChat}
              onSelectChat={onSelectChat}
              selectedChatIndex={selectedChatIndex}
              onDeleteChat={onDeleteChat}
              chatSessions={chatSessions}
            />
          </div>
        </div>
      </div>

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={closeSettingsDialog}
      />
    </>
  );
}
