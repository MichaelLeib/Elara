/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

export const fileDisplayStyle = css`
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.1);

  @media (prefers-color-scheme: dark) {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }
`;

export const fileItemStyle = css`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.875rem;
  color: white;

  @media (prefers-color-scheme: dark) {
    color: white;
  }
`;

export const fileIconStyle = css`
  color: #3b82f6;
  flex-shrink: 0;
`;

export const fileNameStyle = css`
  flex: 1;
  word-break: break-all;
`;

export const fileSizeStyle = css`
  font-size: 0.75rem;
  color: #9ca3af;
  flex-shrink: 0;
`;
