/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { ChangeEvent } from "react";
import { getModels } from "../../api/chatApi";
import type { MessageInputProps, Model } from "./models";
import { ErrorBoundary } from "../../ErrorBoundary";

const messageInputContainerStyle = css`
  width: 100%;
  max-width: 64rem;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 2rem 1.5rem;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);

  @media (prefers-color-scheme: dark) {
    background: rgba(15, 23, 42, 0.8);
  }
`;

const attachmentsPreviewStyle = css`
  margin-bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const attachmentItemStyle = css`
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

const attachmentTextStyle = css`
  color: #374151;
  font-weight: 500;

  @media (prefers-color-scheme: dark) {
    color: #e5e7eb;
  }
`;

const removeButtonStyle = css`
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

const mainInputAreaStyle = css`
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 1rem;
  background: white;
  border-radius: 1.5rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 1.25rem;
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

const fileButtonStyle = css`
  flex-shrink: 0;
  padding: 0.75rem;
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
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;

    &:hover {
      color: #e5e7eb;
      background: rgba(255, 255, 255, 0.1);
    }
  }
`;

const hiddenInputStyle = css`
  display: none;
`;

const dropdownContainerStyle = css`
  position: relative;
  flex-shrink: 0;
`;

const dropdownButtonStyle = css`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;

  &:hover {
    background: rgba(0, 0, 0, 0.06);
    border-color: rgba(0, 0, 0, 0.12);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (prefers-color-scheme: dark) {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e5e7eb;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }
  }
`;

const loadingSpinnerStyle = css`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const spinnerStyle = css`
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

const loadingTextStyle = css`
  color: #6b7280;
  font-weight: 500;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

const dropdownTextStyle = css`
  color: #374151;
  font-weight: 500;

  @media (prefers-color-scheme: dark) {
    color: #e5e7eb;
  }
`;

const dropdownIconStyle = (isOpen: boolean) => css`
  width: 1rem;
  height: 1rem;
  transition: transform 0.2s ease;
  transform: ${isOpen ? "rotate(180deg)" : "rotate(0deg)"};
`;

const dropdownMenuStyle = css`
  position: absolute;
  bottom: 100%;
  margin-bottom: 0.75rem;
  left: 0;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  z-index: 10;
  min-width: 14rem;
  backdrop-filter: blur(8px);

  @media (prefers-color-scheme: dark) {
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  }
`;

const dropdownItemStyle = (isSelected: boolean) => css`
  width: 100%;
  text-align: left;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  background: none;
  border-radius: 0.5rem;
  margin: 0.25rem;

  ${isSelected
    ? `
    background: rgba(59, 130, 246, 0.1);
    color: #2563eb;
    
    @media (prefers-color-scheme: dark) {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
    }
  `
    : `
    color: #374151;
    
    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }
    
    @media (prefers-color-scheme: dark) {
      color: #e5e7eb;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }
  `}
`;

const dropdownItemTextStyle = css`
  font-weight: 500;
`;

const textareaContainerStyle = css`
  flex: 1;
`;

const textareaStyle = css`
  width: 100%;
  padding: 0.75rem;
  resize: none;
  background: transparent;
  border: none;
  outline: none;
  color: #1f2937;
  min-height: 20px;
  max-height: 120px;
  min-width: 100px;
  font-size: 0.95rem;
  line-height: 1.5;
  font-family: inherit;

  &::placeholder {
    color: #9ca3af;
    font-weight: 400;
  }

  @media (prefers-color-scheme: dark) {
    color: #f1f5f9;

    &::placeholder {
      color: #6b7280;
    }
  }
`;

const sendButtonStyle = css`
  flex-shrink: 0;
  padding: 0.75rem;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border-radius: 0.75rem;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  font-weight: 600;
  min-width: 2.5rem;
  min-height: 2.5rem;

  &:hover {
    background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    background: #d1d5db;
    cursor: not-allowed;
    opacity: 0.5;
    transform: none;
    box-shadow: none;
  }

  @media (prefers-color-scheme: dark) {
    &:disabled {
      background: #4b5563;
    }
  }
`;

const overlayStyle = css`
  position: fixed;
  inset: 0;
  z-index: 0;
`;

export interface MessageInputHandle {
  appendToInput: (text: string) => void;
}

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
  function MessageInput(
    { onSendMessage, disabled = false, placeholder = "Type your message..." },
    ref
  ) {
    const [message, setMessage] = useState("");
    const [models, setModels] = useState<Model[]>([]);
    const [selectedModel, setSelectedModel] = useState<Model | null>(null);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Fetch models on component mount
    useEffect(() => {
      const fetchModels = async () => {
        try {
          setIsLoadingModels(true);
          const models = await getModels();

          setModels(models.models);
          setSelectedModel(models.models[0]);
        } catch (error) {
          console.error("Failed to fetch models:", error);
          // Fallback to default models if API fails
          const fallbackModels: Model[] = [
            { name: "GPT-4" },
            { name: "GPT-3.5 Turbo" },
            { name: "Claude-3" },
          ];
          setModels(fallbackModels);
          setSelectedModel(fallbackModels[0]);
        } finally {
          setIsLoadingModels(false);
        }
      };

      fetchModels();
    }, []);

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, []);

    useImperativeHandle(ref, () => ({
      appendToInput: (text: string) => {
        setMessage((prev) => (prev ? prev + "\n" + text : text));
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      },
    }));

    const handleSend = () => {
      if (!message.trim() || disabled || !selectedModel) return;

      onSendMessage(message, selectedModel.name, attachments);
      setMessage("");
      setAttachments([]);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value);

      // Auto-resize textarea
      const textarea = e.target;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      setAttachments((prev) => [...prev, ...files]);

      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    const removeAttachment = (index: number) => {
      setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
      <div css={messageInputContainerStyle}>
        {/* Attachments Preview */}
        <ErrorBoundary>
          {attachments.length > 0 && (
            <div css={attachmentsPreviewStyle}>
              {attachments.map((file, index) => (
                <div
                  key={index}
                  css={attachmentItemStyle}
                >
                  <span css={attachmentTextStyle}>
                    📎 {file.name} ({formatFileSize(file.size)})
                  </span>
                  <button
                    onClick={() => removeAttachment(index)}
                    css={removeButtonStyle}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </ErrorBoundary>

        {/* Main Input Area */}
        <div css={mainInputAreaStyle}>
          {/* File Attachment Button */}
          <ErrorBoundary>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              css={fileButtonStyle}
              type="button"
              title="Add attachment"
            >
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              css={hiddenInputStyle}
              accept="*/*"
            />
          </ErrorBoundary>

          {/* Model Selection Dropdown */}
          <ErrorBoundary>
            <div css={dropdownContainerStyle}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={disabled || isLoadingModels}
                css={dropdownButtonStyle}
                type="button"
              >
                {isLoadingModels ? (
                  <div css={loadingSpinnerStyle}>
                    <div css={spinnerStyle}></div>
                    <span css={loadingTextStyle}>Loading...</span>
                  </div>
                ) : (
                  <>
                    <span css={dropdownTextStyle}>
                      {typeof selectedModel === "object" && selectedModel
                        ? typeof selectedModel.name === "string"
                          ? selectedModel.name
                          : "Invalid Model"
                        : "Select Model"}
                    </span>
                    <svg
                      css={dropdownIconStyle(isDropdownOpen)}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </>
                )}
              </button>

              {isDropdownOpen && models.length > 0 && (
                <div css={dropdownMenuStyle}>
                  {models.map((model, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedModel(model);
                        setIsDropdownOpen(false);
                      }}
                      css={dropdownItemStyle(
                        selectedModel?.name === model.name
                      )}
                      type="button"
                    >
                      <div css={dropdownItemTextStyle}>
                        {typeof model.name === "string"
                          ? model.name
                          : "Invalid Model Name"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ErrorBoundary>

          {/* Textarea */}
          <ErrorBoundary>
            <div css={textareaContainerStyle}>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                css={textareaStyle}
                rows={1}
              />
            </div>
          </ErrorBoundary>

          {/* Send Button */}
          <ErrorBoundary>
            <button
              onClick={handleSend}
              disabled={!message.trim() || disabled || !selectedModel}
              css={sendButtonStyle}
              type="button"
              title="Send message"
            >
              →
            </button>
          </ErrorBoundary>
        </div>

        {/* Click outside to close dropdown */}
        {isDropdownOpen && (
          <div
            css={overlayStyle}
            onClick={() => setIsDropdownOpen(false)}
          />
        )}
      </div>
    );
  }
);
