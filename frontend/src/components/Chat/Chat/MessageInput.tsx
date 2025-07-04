/** @jsxImportSource @emotion/react */
import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { ChangeEvent } from "react";
import { useModelsStore, useFileHandlingStore, useSettingsStore } from "../../../store";
import { ErrorBoundary } from "../../../ErrorBoundary";
import type { MessageInputProps } from "../models";
import type { Model } from "../../../store";
import {
  FaPaperclip,
  FaChevronDown,
  FaArrowRight,
  FaXmark,
} from "react-icons/fa6";
import {
  messageInputContainerStyle,
  attachmentsPreviewStyle,
  attachmentItemStyle,
  imageAttachmentStyle,
  imageThumbnailStyle,
  imageThumbnailLoadingStyle,
  imageInfoStyle,
  imageNameStyle,
  attachmentTextStyle,
  removeButtonStyle,
  mainInputAreaStyle,
  dragOverStyle,
  fileButtonStyle,
  textareaStyle,
  sendButtonStyle,
  modelSelectorStyle,
  modelButtonStyle,
  dropdownStyle,
  dropdownIconStyle,
  dropdownItemStyle,
  modelNameStyle,
  modelDescriptionStyle,
  hiddenFileInputStyle,
  loadingSpinnerStyle,
  spinnerStyle,
  loadingTextStyle,
} from "./MessageInputStyles";
import {
  SUPPORTED_FILE_TYPES,
  getFileIcon,
  formatFileSize,
} from "../../../utils/fileUtils";

export interface MessageInputHandle {
  appendToInput: (text: string) => void;
}

// Extended props to include current session information
interface ExtendedMessageInputProps extends MessageInputProps {
  currentSessionModel?: string;
}

export const MessageInput = forwardRef<
  MessageInputHandle,
  ExtendedMessageInputProps
>(function MessageInput(
  {
    onSendMessage,
    disabled = false,
    placeholder = "Type your message...",
    currentSessionModel,
  },
  ref
) {
  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { models, loading: isLoadingModels } = useModelsStore();

  // Use the settings store to check for auto model selection
  const { settings } = useSettingsStore();

  // Use the file handling store
  const {
    attachments,
    loadingImages,
    imageUrls,
    isDragOver,
    addAttachments,
    removeAttachment,
    setIsDragOver,
    incrementDragCounter,
    decrementDragCounter,
  } = useFileHandlingStore();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const lineHeight = parseFloat(
        getComputedStyle(textareaRef.current).lineHeight || "20"
      );
      const minHeight = lineHeight;
      textareaRef.current.style.height = `${Math.max(
        scrollHeight,
        minHeight
      )}px`;
    }
  }, [message]);

  // Set model when models load or when current session model changes
  useEffect(() => {
    if (models.length > 0) {
      if (currentSessionModel) {
        // Try to find the model that matches the current session's last used model
        const sessionModel = models.find(
          (model) => model.name === currentSessionModel
        );
        if (sessionModel) {
          setSelectedModel(sessionModel);
        } else {
          // Fallback to first model if session model not found
          setSelectedModel(models[0]);
        }
      } else {
        // No session model, default to first model
        setSelectedModel(models[0]);
      }
    }
  }, [models, currentSessionModel]);

  // Expose appendToInput method
  useImperativeHandle(ref, () => ({
    appendToInput: (text: string) => {
      setMessage((prev) => prev + text);
    },
  }));

  const handleSend = () => {
    if (!message.trim() || disabled) return;
    
    // In auto mode, let the backend choose the model
    const modelToUse = settings?.auto_model_selection ? "auto" : selectedModel?.name;
    
    if (!settings?.auto_model_selection && !selectedModel) return;

    onSendMessage(message.trim(), modelToUse || "auto", attachments);
    setMessage("");

    // Clear attachments
    attachments.forEach(() => removeAttachment(0));

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
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addAttachments(files);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleModelSelect = (model: Model) => {
    setSelectedModel(model);
    setIsDropdownOpen(false);
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    incrementDragCounter();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    decrementDragCounter();
    if (useFileHandlingStore.getState().dragCounter === 0) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      addAttachments(files);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files);
    if (files.length > 0) {
      addAttachments(files);
    }
  };

  const isSendDisabled = !message.trim() || disabled || (!settings?.auto_model_selection && !selectedModel);

  return (
    <ErrorBoundary>
      <div css={messageInputContainerStyle}>
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div css={attachmentsPreviewStyle}>
            {attachments.map((file, index) => {
              const isImage = file.type.startsWith("image/");
              const isLoading = loadingImages.has(file.name);
              const imageUrl = imageUrls.get(file.name);

              return (
                <div
                  key={`${file.name}-${index}`}
                  css={isImage ? imageAttachmentStyle : attachmentItemStyle}
                >
                  {isImage ? (
                    <>
                      <img
                        src={imageUrl || ""}
                        alt={file.name}
                        css={
                          isLoading
                            ? imageThumbnailLoadingStyle
                            : imageThumbnailStyle
                        }
                        onLoad={() => {
                          // Handle image load if needed
                        }}
                        onError={() => {
                          // Handle image error if needed
                        }}
                      />
                      <div css={imageInfoStyle}>
                        <span css={imageNameStyle}>{file.name}</span>
                        <button
                          css={removeButtonStyle}
                          onClick={() => removeAttachment(index)}
                          title="Remove attachment"
                        >
                          <FaXmark />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span>{getFileIcon(file.type)}</span>
                      <div>
                        <div css={attachmentTextStyle}>{file.name}</div>
                        <div css={attachmentTextStyle}>
                          {formatFileSize(file.size)}
                        </div>
                      </div>
                      <button
                        css={removeButtonStyle}
                        onClick={() => removeAttachment(index)}
                        title="Remove attachment"
                      >
                        <FaXmark />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Main Input Area */}
        <div
          css={[mainInputAreaStyle, isDragOver && dragOverStyle]}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onPaste={handlePaste}
        >
          {/* File Attachment Button */}
          <button
            css={fileButtonStyle}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Attach files"
          >
            <FaPaperclip />
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={SUPPORTED_FILE_TYPES.join(",")}
            onChange={handleFileSelect}
            css={hiddenFileInputStyle}
          />

          {/* Model Selector */}
          {!settings?.auto_model_selection && (
            <div css={modelSelectorStyle}>
              <button
                css={modelButtonStyle}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={disabled || isLoadingModels}
              >
                {selectedModel ? (
                  <>
                    <div>
                      <div css={modelNameStyle}>{selectedModel.name}</div>
                      <div css={modelDescriptionStyle}>
                        {selectedModel.description}
                      </div>
                    </div>
                  </>
                ) : (
                  <div css={loadingSpinnerStyle}>
                    <div css={spinnerStyle} />
                    <span css={loadingTextStyle}>Loading models...</span>
                  </div>
                )}
                <FaChevronDown css={dropdownIconStyle(isDropdownOpen)} />
              </button>

              {/* Model Dropdown */}
              {isDropdownOpen && (
                <div css={dropdownStyle}>
                  {models.map((model) => (
                    <button
                      key={model.name}
                      css={dropdownItemStyle(selectedModel?.name === model.name)}
                      onClick={() => handleModelSelect(model)}
                    >
                      <div>
                        <div css={modelNameStyle}>{model.name}</div>
                        <div css={modelDescriptionStyle}>{model.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            css={textareaStyle}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={isSendDisabled}
            css={sendButtonStyle(isSendDisabled)}
            title="Send message"
          >
            <FaArrowRight />
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
});
