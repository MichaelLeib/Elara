import { css } from "@emotion/react";

export const messageInputContainerStyle = css`
  padding: 0.25rem;
  backdrop-filter: blur(12px);
`;

export const attachmentsPreviewStyle = css`
  margin-bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

export const attachmentItemStyle = css`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  @media (prefers-color-scheme: dark) {
    background: rgba(30, 41, 59, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

export const imageAttachmentStyle = css`
  ${attachmentItemStyle}
  flex-direction: column;
  align-items: flex-start;
  padding: 0.5rem;
  min-width: 120px;
`;

export const imageThumbnailStyle = css`
  width: 80px;
  height: 60px;
  object-fit: cover;
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #f3f4f6;
  transition: opacity 0.2s ease;

  @media (prefers-color-scheme: dark) {
    border-color: rgba(255, 255, 255, 0.1);
    background: #374151;
  }
`;

export const imageThumbnailLoadingStyle = css`
  ${imageThumbnailStyle}
  opacity: 0.6;
`;

export const imageInfoStyle = css`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  justify-content: space-between;
`;

export const imageNameStyle = css`
  color: #374151;
  font-weight: 500;
  font-size: 0.75rem;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (prefers-color-scheme: dark) {
    color: #e5e7eb;
  }
`;

export const attachmentTextStyle = css`
  color: #374151;
  font-weight: 500;

  @media (prefers-color-scheme: dark) {
    color: #e5e7eb;
  }
`;

export const removeButtonStyle = css`
  color: #ef4444;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0.25rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  font-size: 1.125rem;
  line-height: 1;

  &:hover {
    color: #dc2626;
    background: rgba(239, 68, 68, 0.1);
  }

  @media (prefers-color-scheme: dark) {
    &:hover {
      color: #f87171;
      background: rgba(239, 68, 68, 0.2);
    }
  }
`;

export const mainInputAreaStyle = css`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
  background: white;
  border-radius: 1.5rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 0 1rem 0 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;

  &:focus-within {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-color: rgba(59, 130, 246, 0.3);
  }

  @media (prefers-color-scheme: dark) {
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.1);

    &:focus-within {
      border-color: rgba(59, 130, 246, 0.5);
    }
  }
`;

export const dragOverStyle = css`
  border-color: rgba(59, 130, 246, 0.5) !important;
  background: rgba(59, 130, 246, 0.05) !important;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2) !important;

  @media (prefers-color-scheme: dark) {
    background: rgba(59, 130, 246, 0.1) !important;
  }
`;

export const fileButtonStyle = css`
  flex-shrink: 0;
  padding: 0.25rem;
  color: #6b7280;
  cursor: pointer;
  border-radius: 0.75rem;
  transition: all 0.2s ease;
  border: none;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #374151;
    background: rgba(0, 0, 0, 0.05);
  }

  &:disabled {
    color: #9ca3af;
    cursor: not-allowed;
  }

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;

    &:hover {
      color: #e5e7eb;
      background: rgba(255, 255, 255, 0.1);
    }

    &:disabled {
      color: #6b7280;
    }
  }
`;

export const textareaStyle = css`
  flex: 1;
  max-height: 8rem;
  min-height: 0.2rem;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.9rem;
  line-height: 1.1rem;
  color: #374151;
  resize: none;
  font-family: inherit;
  padding: 0.5rem 0 0 0;

  &::placeholder {
    color: #9ca3af;
  }

  @media (prefers-color-scheme: dark) {
    color: #e5e7eb;

    &::placeholder {
      color: #6b7280;
    }
  }
`;

export const sendButtonStyle = (isDisabled: boolean) => css`
  flex-shrink: 0;
  padding: 0.25rem;
  color: white;
  cursor: ${isDisabled ? "not-allowed" : "pointer"};
  border-radius: 0.75rem;
  transition: all 0.2s ease;
  border: none;
  background: ${isDisabled
    ? "linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)"
    : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"};
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${isDisabled ? 0.6 : 1};

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

export const modelSelectorStyle = css`
  position: relative;
  flex-shrink: 0;
`;

export const modelButtonStyle = css`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem;
  color: #6b7280;
  cursor: pointer;
  border-radius: 0.75rem;
  transition: all 0.2s ease;
  border: none;
  background: none;
  font-size: 0.875rem;
  font-weight: 500;

  &:hover {
    color: #374151;
    background: rgba(0, 0, 0, 0.05);
  }

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;

    &:hover {
      color: #e5e7eb;
      background: rgba(255, 255, 255, 0.1);
    }
  }
`;

export const dropdownStyle = css`
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 0.5rem;

  @media (prefers-color-scheme: dark) {
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

export const dropdownIconStyle = (isOpen: boolean) => css`
  transition: transform 0.2s ease;
  transform: rotate(${isOpen ? "180deg" : "0deg"});
`;

export const dropdownItemStyle = (isSelected: boolean) => css`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  font-size: 0.875rem;
  color: ${isSelected ? "#3b82f6" : "#374151"};
  background: ${isSelected ? "rgba(59, 130, 246, 0.1)" : "transparent"};

  &:hover {
    background: ${isSelected
      ? "rgba(59, 130, 246, 0.15)"
      : "rgba(0, 0, 0, 0.05)"};
  }

  &:first-of-type {
    border-radius: 0.75rem 0.75rem 0 0;
  }

  &:last-of-type {
    border-radius: 0 0 0.75rem 0.75rem;
  }

  @media (prefers-color-scheme: dark) {
    color: ${isSelected ? "#60a5fa" : "#e5e7eb"};
    background: ${isSelected ? "rgba(96, 165, 250, 0.1)" : "transparent"};

    &:hover {
      background: ${isSelected
        ? "rgba(96, 165, 250, 0.15)"
        : "rgba(255, 255, 255, 0.1)"};
    }
  }
`;

export const modelIconStyle = css`
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 0.25rem;
`;

export const modelNameStyle = css`
  flex: 1;
  font-weight: 500;
  font-size: 0.8rem;
`;

export const modelDescriptionStyle = css`
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.125rem;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

export const hiddenFileInputStyle = css`
  display: none;
`;

export const loadingSpinnerStyle = css`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const spinnerStyle = css`
  animation: spin 1s linear infinite;
  border-radius: 50%;
  height: 0.875rem;
  width: 0.875rem;
  border: 2px solid transparent;
  border-bottom-color: #6b7280;

  @media (prefers-color-scheme: dark) {
    border-bottom-color: #9ca3af;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const loadingTextStyle = css`
  color: #6b7280;
  font-weight: 500;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;
