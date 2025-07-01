import { css } from "@emotion/react";

export const messageListContainerStyle = css`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  height: 90vh;
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
  bottom: 0.05rem;
  right: 0.05rem;
  background: rgba(30, 41, 59, 0.8);
  border: none;
  border-radius: 0.5rem;
  padding: 0.2rem 0.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  color: #60a5fa;
  transition: background 0.2s;
  opacity: 0.85;
  &:hover {
    background: #1d4ed8;
    color: #fff;
    opacity: 1;
  }
`;
