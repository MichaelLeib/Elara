/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import type { ChangeEvent, DragEvent } from "react";
import { useModels } from "../../context/useModels";
import { ErrorBoundary } from "../../ErrorBoundary";
import type { MessageInputProps } from "./models";
import type { Model } from "../../context/ModelsContext";
import type { Message } from "./models";
import {
  FaPaperclip,
  FaChevronDown,
  FaArrowRight,
  FaXmark,
} from "react-icons/fa6";
import { useSettings } from "../../context/useSettings";
import {
  SUPPORTED_FILE_TYPES,
  getFileIcon,
  formatFileSize,
  validateFiles,
} from "../../utils/fileUtils";

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

const dragOverStyle = css`
  border-color: rgba(59, 130, 246, 0.5) !important;
  background: rgba(59, 130, 246, 0.05) !important;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2) !important;

  @media (prefers-color-scheme: dark) {
    background: rgba(59, 130, 246, 0.1) !important;
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

const dragOverlayStyle = css`
  position: fixed;
  inset: 0;
  background: rgba(59, 130, 246, 0.1);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  pointer-events: none;
`;

const dragOverlayContentStyle = css`
  background: white;
  border: 2px dashed rgba(59, 130, 246, 0.5);
  border-radius: 1rem;
  padding: 2rem;
  text-align: center;
  color: #374151;
  font-weight: 600;
  font-size: 1.125rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

  @media (prefers-color-scheme: dark) {
    background: #1e293b;
    color: #e5e7eb;
    border-color: rgba(59, 130, 246, 0.7);
  }
`;

const fileTypeIconStyle = css`
  margin-right: 0.5rem;
  color: #6b7280;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

export interface MessageInputHandle {
  appendToInput: (text: string) => void;
}

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
  function MessageInput(
    {
      onSendMessage,
      disabled = false,
      placeholder = "Type your message...",
      messages = [],
    },
    ref
  ) {
    const [message, setMessage] = useState("");
    const [selectedModel, setSelectedModel] = useState<Model | null>(null);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [dragCounter, setDragCounter] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const { models, loading: isLoadingModels } = useModels();
    const { settings } = useSettings();

    // Extract the last used model from messages
    const getLastUsedModel = useCallback(
      (messages: Message[]): string | null => {
        // Look for the last message with a model (prefer user messages, then assistant messages)
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          if (msg.model) {
            // Handle both string and Model object types
            if (typeof msg.model === "string") {
              return msg.model;
            } else if (typeof msg.model === "object" && msg.model?.name) {
              return msg.model.name;
            }
          }
        }
        return null;
      },
      []
    );

    // Set default model when models are loaded or when messages change
    useEffect(() => {
      if (models && models.length > 0) {
        // First try to get the last used model from messages
        const lastUsedModelName = getLastUsedModel(messages);

        if (lastUsedModelName) {
          // Find the model in the available models
          const lastUsedModel = models.find(
            (model) => model.name === lastUsedModelName
          );
          if (lastUsedModel) {
            setSelectedModel(lastUsedModel);
            return;
          }
        }

        // Fallback to the first available model
        setSelectedModel(models[0]);
      }
    }, [models, messages, getLastUsedModel]);

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

    const validateAndAddFiles = useCallback((files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const { valid, errors } = validateFiles(fileArray);

      if (errors.length > 0) {
        alert(
          `File validation errors:\n${errors.join(
            "\n"
          )}\n\nSupported types: ${SUPPORTED_FILE_TYPES.join(
            ", "
          )}\nMax file size: 10MB`
        );
      }

      if (valid.length > 0) {
        setAttachments((prev) => [...prev, ...valid]);
      }

      return valid.length > 0;
    }, []);

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        validateAndAddFiles(files);
      }

      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    const removeAttachment = (index: number) => {
      setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    // Drag and drop handlers
    const handleDragEnter = useCallback((e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter((prev) => prev + 1);
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragOver(true);
      }
    }, []);

    const handleDragLeave = useCallback(
      (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragCounter((prev) => prev - 1);
        if (dragCounter === 0) {
          setIsDragOver(false);
        }
      },
      [dragCounter]
    );

    const handleDragOver = useCallback((e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
      (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        setDragCounter(0);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          validateAndAddFiles(files);
        }
      },
      [validateAndAddFiles]
    );

    // Add drag and drop event listeners
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const dragEnterHandler = (e: Event) =>
        handleDragEnter(e as unknown as DragEvent);
      const dragLeaveHandler = (e: Event) =>
        handleDragLeave(e as unknown as DragEvent);
      const dragOverHandler = (e: Event) =>
        handleDragOver(e as unknown as DragEvent);
      const dropHandler = (e: Event) => handleDrop(e as unknown as DragEvent);

      container.addEventListener("dragenter", dragEnterHandler);
      container.addEventListener("dragleave", dragLeaveHandler);
      container.addEventListener("dragover", dragOverHandler);
      container.addEventListener("drop", dropHandler);

      return () => {
        container.removeEventListener("dragenter", dragEnterHandler);
        container.removeEventListener("dragleave", dragLeaveHandler);
        container.removeEventListener("dragover", dragOverHandler);
        container.removeEventListener("drop", dropHandler);
      };
    }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

    return (
      <div
        css={messageInputContainerStyle}
        data-message-input
      >
        {/* Drag Overlay */}
        {isDragOver && (
          <div css={dragOverlayStyle}>
            <div css={dragOverlayContentStyle}>Drop files here to analyze</div>
          </div>
        )}

        {/* Attachments Preview */}
        <ErrorBoundary>
          {attachments.length > 0 && (
            <div css={attachmentsPreviewStyle}>
              {attachments.map((file, index) => (
                <div
                  key={index}
                  css={attachmentItemStyle}
                >
                  <span css={fileTypeIconStyle}>{getFileIcon(file.name)}</span>
                  <span css={attachmentTextStyle}>
                    {file.name} ({formatFileSize(file.size)})
                  </span>
                  <button
                    onClick={() => removeAttachment(index)}
                    css={removeButtonStyle}
                    type="button"
                    title="Remove file"
                  >
                    <FaXmark size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ErrorBoundary>

        {/* Main Input Area */}
        <div
          css={[mainInputAreaStyle, isDragOver && dragOverStyle]}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          ref={containerRef}
        >
          {/* File Attachment Button */}
          <ErrorBoundary>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              css={fileButtonStyle}
              type="button"
              title="Add attachment"
            >
              <FaPaperclip size={20} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              css={hiddenInputStyle}
              accept={SUPPORTED_FILE_TYPES.join(",")}
            />
          </ErrorBoundary>

          {/* Model Selection Dropdown */}
          {settings?.manual_model_switch && (
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
                      <FaChevronDown
                        css={dropdownIconStyle(isDropdownOpen)}
                        size={16}
                      />
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
          )}

          {/* Textarea */}
          <ErrorBoundary>
            <div css={textareaContainerStyle}>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  attachments.length > 0
                    ? "Ask about your documents..."
                    : placeholder
                }
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
              <FaArrowRight size={16} />
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
