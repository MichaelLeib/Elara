import { css } from "@emotion/react";

export const appStyle = css`
  display: flex;
  flex-direction: row;
  height: 100vh;
  width: 100vw;
`;

export const appChatContainerStyle = css`
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 50px;
  margin: 50px;
`;

export const confirmDialogStyle = css`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

export const confirmDialogContentStyle = css`
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);

  @media (prefers-color-scheme: dark) {
    background: #1e293b;
    color: #f1f5f9;
  }
`;

export const confirmDialogTitleStyle = css`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: #1f2937;

  @media (prefers-color-scheme: dark) {
    color: #f1f5f9;
  }
`;

export const confirmDialogMessageStyle = css`
  font-size: 0.95rem;
  margin: 0 0 1.5rem 0;
  color: #6b7280;
  line-height: 1.5;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

export const confirmDialogButtonsStyle = css`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

export const buttonStyle = (isPrimary: boolean) => css`
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  ${isPrimary
    ? `
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    
    &:hover {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    }
  `
    : `
    background: #f3f4f6;
    color: #374151;
    
    &:hover {
      background: #e5e7eb;
    }

    @media (prefers-color-scheme: dark) {
      background: #374151;
      color: #f1f5f9;
      
      &:hover {
        background: #4b5563;
      }
    }
  `}
`;
