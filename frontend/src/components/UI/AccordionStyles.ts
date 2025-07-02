/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

export const accordionStyle = css`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
`;

export const accordionHeaderStyle = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f9fafb;
  cursor: pointer;
  border: none;
  width: 100%;
  text-align: left;
  transition: background-color 0.2s;

  &:hover {
    background: #f3f4f6;
  }

  @media (prefers-color-scheme: dark) {
    background: #374151;
    color: #d1d5db;

    &:hover {
      background: #4b5563;
    }
  }
`;

export const accordionTitleStyle = css`
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;

  @media (prefers-color-scheme: dark) {
    color: #d1d5db;
  }
`;

export const accordionIconStyle = (isOpen: boolean) => css`
  transition: transform 0.2s;
  transform: ${isOpen ? "rotate(180deg)" : "rotate(0deg)"};
  color: #6b7280;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

export const accordionContentStyle = (isOpen: boolean) => css`
  max-height: ${isOpen ? "2000px" : "0"};
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
`;

export const accordionInnerStyle = css`
  padding: 20px;
  border-top: 1px solid #e5e7eb;

  @media (prefers-color-scheme: dark) {
    border-top-color: #4b5563;
  }
`;
