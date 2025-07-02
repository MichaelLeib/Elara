/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

export const errorContainerStyle = css`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  padding: 2rem;
`;

export const errorStyle = css`
  color: #dc2626;
  font-family: system-ui, -apple-system, sans-serif;
  white-space: pre-wrap;
  padding: 2rem;
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.3);
  border-radius: 0.75rem;
  max-width: 600px;
  text-align: center;

  @media (prefers-color-scheme: dark) {
    background: rgba(220, 38, 38, 0.2);
    border-color: rgba(220, 38, 38, 0.4);
    color: #f87171;
  }
`;

export const errorTitleStyle = css`
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: #dc2626;

  @media (prefers-color-scheme: dark) {
    color: #f87171;
  }
`;

export const errorMessageStyle = css`
  margin-bottom: 1.5rem;

  p {
    margin: 0 0 1rem 0;
    line-height: 1.6;
  }

  details {
    margin-top: 1rem;
    text-align: left;

    summary {
      cursor: pointer;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    pre {
      background: rgba(0, 0, 0, 0.1);
      padding: 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      overflow-x: auto;
      margin: 0.5rem 0;

      @media (prefers-color-scheme: dark) {
        background: rgba(255, 255, 255, 0.1);
      }
    }
  }
`;

export const retryButtonStyle = css`
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: #b91c1c;
  }

  &:focus {
    outline: 2px solid #dc2626;
    outline-offset: 2px;
  }

  @media (prefers-color-scheme: dark) {
    background: #ef4444;

    &:hover {
      background: #dc2626;
    }

    &:focus {
      outline-color: #ef4444;
    }
  }
`;
