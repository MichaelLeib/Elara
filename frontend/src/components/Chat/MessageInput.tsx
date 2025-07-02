/** @jsxImportSource @emotion/react */
import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { ChangeEvent } from "react";
import { useModels } from "../../context/useModels";
import { ErrorBoundary } from "../../ErrorBoundary";
import type { MessageInputProps } from "./models";
import type { Model } from "../../context/ModelsContext";
import {
  FaPaperclip,
  FaChevronDown,
  FaArrowRight,
  FaXmark,
} from "react-icons/fa6";

import { useFileHandling } from "../../hooks/useFileHandling";
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
  modelIconStyle,
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
} from "../../utils/fileUtils";

export interface MessageInputHandle {
  appendToInput: (text: string) => void;
}

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
  function MessageInput(
    { onSendMessage, disabled = false, placeholder = "Type your message..." },
    ref
  ) {
    const [message, setMessage] = useState("");
    const [selectedModel, setSelectedModel] = useState<Model | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { models, loading: isLoadingModels } = useModels();

    // Use the file handling hook
    const {
      attachments,
      loadingImages,
      imageUrls,
      isDragOver,
      addAttachments,
      removeAttachment,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      handlePaste,
    } = useFileHandling();

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

    // Set default model when models load
    useEffect(() => {
      if (models.length > 0 && !selectedModel) {
        setSelectedModel(models[0]);
      }
    }, [models, selectedModel]);

    // Expose appendToInput method
    useImperativeHandle(ref, () => ({
      appendToInput: (text: string) => {
        setMessage((prev) => prev + text);
      },
    }));

    const handleSend = () => {
      if (!message.trim() || !selectedModel || disabled) return;

      onSendMessage(message.trim(), selectedModel.name, attachments);
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

    const isSendDisabled = !message.trim() || !selectedModel || disabled;

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
            <div css={modelSelectorStyle}>
              <button
                css={modelButtonStyle}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={disabled || isLoadingModels}
              >
                {selectedModel ? (
                  <>
                    <div css={modelIconStyle}>
                      {selectedModel.name.charAt(0).toUpperCase()}
                    </div>
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
                      css={dropdownItemStyle(
                        selectedModel?.name === model.name
                      )}
                      onClick={() => handleModelSelect(model)}
                    >
                      <div css={modelIconStyle}>
                        {model.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div css={modelNameStyle}>{model.name}</div>
                        <div css={modelDescriptionStyle}>
                          {model.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

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
  }
);
