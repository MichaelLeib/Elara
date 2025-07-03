/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

export const testContainerStyle = css`
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
`;

export const testSectionStyle = css`
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;

  @media (prefers-color-scheme: dark) {
    background: #1f2937;
    border-color: #374151;
    color: #f9fafb;
  }
`;

export const titleStyle = css`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #111827;

  @media (prefers-color-scheme: dark) {
    color: #f9fafb;
  }
`;

export const fileListStyle = css`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const fileItemStyle = css`
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:last-child {
    border-bottom: none;
  }

  @media (prefers-color-scheme: dark) {
    border-bottom-color: #374151;
  }
`;

export const supportedStyle = css`
  color: #059669;
  font-weight: 600;

  @media (prefers-color-scheme: dark) {
    color: #34d399;
  }
`;

export const unsupportedStyle = css`
  color: #dc2626;
  font-weight: 600;

  @media (prefers-color-scheme: dark) {
    color: #f87171;
  }
`;

export const fileInputStyle = css`
  margin-bottom: 1rem;
`;
