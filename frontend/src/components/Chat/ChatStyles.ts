/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

export const chatContainerStyle = (isPrivate: boolean) => css`
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  flex: 1;
  min-height: 0;
  height: 100%;
  position: relative;
  padding: 1rem;
  width: 80%;

  ${isPrivate &&
  `
    background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
    border-radius: 1.5rem;
    border: 1px solid rgba(139, 92, 246, 0.2);
    padding: 1rem;
    
    @media (prefers-color-scheme: dark) {
      background: linear-gradient(135deg, #2e1065 0%, #4c1d95 100%);
      border: 1px solid rgba(139, 92, 246, 0.3);
    }
  `}
`;

export const privateChatIndicatorStyle = css`
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(139, 92, 246, 0.9);
  color: #f3e8ff;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(139, 92, 246, 0.3);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);

  @media (prefers-color-scheme: dark) {
    background: rgba(139, 92, 246, 0.8);
    color: #f3e8ff;
    border: 1px solid rgba(139, 92, 246, 0.4);
  }
`;

export const chatMessageListContainerStyle = css`
  flex: 1;
  min-height: 0;
  margin-top: 1rem;
  position: relative;
`;

export const chatMessageInputContainerStyle = css`
  flex-shrink: 0;
  width: 100%;
  position: relative;
  z-index: 10;
`;
