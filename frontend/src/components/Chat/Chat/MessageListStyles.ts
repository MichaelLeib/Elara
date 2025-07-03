import { css } from "@emotion/react";

export const messageListContainerStyle = css`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  overflow-y: auto;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  position: relative;
  border-radius: 1.5rem;
  border: 1px solid rgba(0, 0, 0, 0.08);

  @media (prefers-color-scheme: dark) {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
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

export const messageContainerStyle = (isUser: boolean) => css`
  display: flex;
  flex-direction: column;
  align-items: ${isUser ? "flex-end" : "flex-start"};
  gap: 0.75rem;
  max-width: 85%;
  margin: ${isUser ? "0 0 0 auto" : "0 auto 0 0"};
  animation: fadeInUp 0.3s ease-out;

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export const messageBubbleStyle = (isUser: boolean) => css`
  max-width: 100%;
  padding: 1rem 1.25rem;
  border-radius: 1.25rem;
  font-size: 0.95rem;
  text-align: start;
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.6;
  font-weight: 400;
  letter-spacing: 0.01em;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
  position: relative;
  margin-bottom: 1rem;
  width: 80%;

  /* Enhanced bullet points */
  ul,
  ol {
    margin: 0.75rem 0;
    padding-left: 1.75rem;
  }

  li {
    margin: 0.5rem 0;
    line-height: 1.5;
  }

  /* Code blocks */
  code {
    background: rgba(0, 0, 0, 0.05);
    padding: 0.2rem 0.4rem;
    border-radius: 0.375rem;
    font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
    font-size: 0.85em;

    @media (prefers-color-scheme: dark) {
      background: rgba(255, 255, 255, 0.1);
    }
  }

  /* Links */
  a {
    color: inherit;
    text-decoration: underline;
    text-decoration-color: rgba(255, 255, 255, 0.6);
    text-underline-offset: 2px;

    &:hover {
      text-decoration-color: rgba(255, 255, 255, 0.9);
    }
  }

  ${isUser
    ? `
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    border-bottom-right-radius: 0.25rem;
    
    &:hover {
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      transform: translateY(-1px);
    }
    
    a {
      color: #bfdbfe;
      text-decoration-color: rgba(191, 219, 254, 0.6);
      
      &:hover {
        color: #dbeafe;
        text-decoration-color: rgba(219, 234, 254, 0.9);
      }
    }
  `
    : `
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    color: #1f2937;
    border-bottom-left-radius: 0.25rem;
    border: 1px solid lightgray;
      box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.15);
    
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
      border-color: #cbd5e1;
    }
    
    a {
      color: #2563eb;
      text-decoration-color: rgba(37, 99, 235, 0.6);
      
      &:hover {
        color: #1d4ed8;
        text-decoration-color: rgba(29, 78, 216, 0.9);
      }
    }
    
    @media (prefers-color-scheme: dark) {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.1);
      
      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border-color: rgba(255, 255, 255, 0.2);
      }
      
      a {
        color: #60a5fa;
        text-decoration-color: rgba(96, 165, 250, 0.6);
        
        &:hover {
          color: #3b82f6;
          text-decoration-color: rgba(59, 130, 246, 0.9);
        }
      }
    }
  `}
`;

export const messageTimestampStyle = () => css`
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  letter-spacing: 0.025em;
  margin-bottom: 0.25rem;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

export const messageModelStyle = () => css`
  font-size: 0.7rem;
  color: #9ca3af;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
  opacity: 0.8;

  @media (prefers-color-scheme: dark) {
    color: #6b7280;
  }
`;

export const thinkingContainerStyle = css`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }
`;

export const loadMoreStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  color: #6b7280;
  font-size: 0.875rem;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  border-radius: 0.75rem;
  margin: 1rem 0;
  border: 1px solid rgba(0, 0, 0, 0.05);

  @media (prefers-color-scheme: dark) {
    background: rgba(30, 41, 59, 0.8);
    color: #9ca3af;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

export const enterButtonStyle = css`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #3b82f6;
  border-radius: 0.375rem;
  padding: 0.2rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 500;
  z-index: 1000;
  border-radius: 0.5rem;

  &:hover {
    background: rgba(59, 130, 246, 0.3);
    border-color: rgba(59, 130, 246, 0.5);
  }

  @media (prefers-color-scheme: dark) {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.4);
    color: #60a5fa;

    &:hover {
      background: rgba(59, 130, 246, 0.3);
      border-color: rgba(59, 130, 246, 0.6);
    }
  }
`;

export const messageListStyle = css`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const messageStyle = css`
  padding: 1rem;
  border-radius: 0.75rem;
  max-width: 80%;
  word-wrap: break-word;
  white-space: pre-wrap;
`;

export const userMessageStyle = css`
  ${messageStyle}
  align-self: flex-end;
  margin-left: auto;
`;

export const assistantMessageStyle = css`
  ${messageStyle}
  align-self: flex-start;
  margin-right: auto;
`;

export const thinkingStyle = css`
  ${assistantMessageStyle}
`;

export const streamingStyle = css`
  ${assistantMessageStyle}
  position: relative;

  &::after {
    content: "";
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    width: 8px;
    height: 8px;
    background: #3b82f6;
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }
`;

export const loadMoreButtonStyle = css`
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  align-self: center;
  margin: 1rem 0;

  &:hover {
    background: #2563eb;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  @media (prefers-color-scheme: dark) {
    background: #1d4ed8;

    &:hover {
      background: #1e40af;
    }
  }
`;

export const progressBarContainerStyle = css`
  width: 100%;
  background: #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
  margin: 0.5rem 0;

  @media (prefers-color-scheme: dark) {
    background: #374151;
  }
`;

export const progressBarStyle = css`
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  transition: width 0.3s ease;
  border-radius: 0.5rem;
`;

export const progressTextStyle = css`
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
  text-align: center;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

export const lightEffectStyle = css`
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(59, 130, 246, 0.2) 50%,
    transparent 100%
  );
  animation: lightSweep 2s ease-in-out infinite;
  z-index: 1;

  @keyframes lightSweep {
    0% {
      left: -100%;
    }
    50% {
      left: 100%;
    }
    100% {
      left: 100%;
    }
  }
`;

export const stopButtonStyle = css`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  border-radius: 0.375rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 500;
  z-index: 1000;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
  }

  @media (prefers-color-scheme: dark) {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
    color: #f87171;

    &:hover {
      background: rgba(239, 68, 68, 0.3);
      border-color: rgba(239, 68, 68, 0.6);
    }
  }
`;

export const stoppingSpinnerStyle = css`
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 6px;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

export const progressContainerStyle = css`
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 0.5rem;
  border: 1px solid rgba(59, 130, 246, 0.2);
  position: relative;
  overflow: hidden;
`;
