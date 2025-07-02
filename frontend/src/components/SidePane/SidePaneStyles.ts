/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

export const drawerContainerStyle = css`
  z-index: 50;
  pointer-events: none;
  transition: all 0.3s ease-in-out;

  @media (min-width: 768px) {
    width: 320px;
  }
`;

export const drawerOpenStyle = css`
  pointer-events: auto;
`;

export const toggleButtonStyle = (isOpen: boolean) => css`
  width: 2.2rem;
  height: 2.2rem;
  z-index: 60;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &:hover {
    background: rgba(255, 255, 255, 1);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  @media (prefers-color-scheme: dark) {
    background: rgba(30, 41, 59, 0.9);
    border-color: rgba(255, 255, 255, 0.1);
    color: #e5e7eb;

    &:hover {
      background: rgba(30, 41, 59, 1);
    }
  }
  ${!isOpen &&
  css`
    position: fixed;
    top: 1rem;
    left: 1rem;
    z-index: 1000;
    border-radius: 0.5rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  `}
`;

export const drawerContentStyle = css`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  transform: translateX(-100%);
  transition: transform 0.3s ease-in-out;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  @media (min-width: 768px) {
    width: 320px;
  }

  @media (prefers-color-scheme: dark) {
    background: rgba(30, 41, 59, 0.95);
    border-right-color: rgba(255, 255, 255, 0.1);
  }
`;

export const drawerContentOpenStyle = css`
  transform: translateX(0);
`;

export const drawerHeaderStyle = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);

  @media (prefers-color-scheme: dark) {
    background: rgba(30, 41, 59, 0.8);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
`;

export const drawerTitleStyle = css`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;

  @media (prefers-color-scheme: dark) {
    color: #f1f5f9;
  }
`;

export const settingsButtonStyle = css`
  width: 2.2rem;
  height: 2.2rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #3b82f6;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.3);
    transform: translateY(-1px);
  }

  @media (prefers-color-scheme: dark) {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.3);
    color: #60a5fa;

    &:hover {
      background: rgba(59, 130, 246, 0.3);
      border-color: rgba(59, 130, 246, 0.4);
    }
  }
`;

export const drawerScrollableContentStyle = css`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;

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
