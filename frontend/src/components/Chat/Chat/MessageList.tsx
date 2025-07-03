/** @jsxImportSource @emotion/react */
import React, { useMemo } from "react";
import type { MessageListProps as OriginalMessageListProps } from "../models.ts";
import { FaArrowDown, FaStop } from "react-icons/fa";
import {
  messageListStyle,
  userMessageStyle,
  streamingStyle,
  loadMoreButtonStyle,
  progressBarContainerStyle,
  progressBarStyle,
  progressTextStyle,
  lightEffectStyle,
  stopButtonStyle,
  assistantMessageStyle,
  messageBubbleStyle,
  thinkingStyle,
  enterButtonStyle,
  stoppingSpinnerStyle,
  progressContainerStyle,
} from "./MessageListStyles.ts";
import { AnimatedProgressText } from "../DocumentAnalysis/DocAnalysisProgress.tsx";
import { FileList } from "../DocumentAnalysis/FileList.tsx";
import { AnimatedThinking } from "./AnimatedThinking.tsx";
import { MemoryNotification } from "./MemoryNotification.tsx";
import SourcePills from "../../UI/SourcePills.tsx";
import LoadingSpinner from "../../UI/LoadingSpinner.tsx";
import { useScrollManagement } from "../../../hooks/useScrollManagement.ts";
import { useUIStore } from "../../../store";

interface MessageListProps extends OriginalMessageListProps {
  onAppendToInput?: (text: string) => void;
  isPrivate?: boolean;
  handlePdfChoice?: (msgId: string, choice: "ocr" | "vision") => void;
}

const formatMessage = (message: string) => {
  if (!message) return "";

  return (
    message
      // Handle bullet points (both - and *)
      .replace(/^[-*]\s+/gm, "• ")
      // Handle numbered lists (preserve them)
      .replace(/^(\d+\.\s+)/gm, "$1")
      // Add line breaks for better readability
      .split("\n")
      .map((line) => {
        // If line is too long, break it at sentence boundaries
        if (line.length > 80) {
          return line.replace(/([.!?])\s+/g, "$1\n");
        }
        return line;
      })
      .join("\n")
      // Clean up multiple line breaks
      .replace(/\n\s*\n/g, "\n\n")
      .trim()
  );
};

function MessageListComponent({
  messages,
  isThinking = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  onAppendToInput,
  isPrivate = false,
  handlePdfChoice,
}: MessageListProps) {
  const {
    progress,
    progressText,
    isStreaming,
    memoryNotification,
    isStopping,
    webSearchStatus,
    setMemoryNotification,
    pdfChoiceId,
  } = useUIStore();

  const handleMemoryNotificationClose = () => {
    setMemoryNotification({
      isVisible: false,
      message: "",
      savedItems: [],
    });
  };

  const handleStopAnalysis = () => {
    window.dispatchEvent(
      new CustomEvent("stop-analysis", {
        detail: { timestamp: Date.now() },
      })
    );
  };

  // Use custom hooks for scroll management and event handling
  const { containerRef } = useScrollManagement({
    hasMore,
    isLoadingMore,
    onLoadMore,
    messages,
    isThinking,
    isStreaming,
    progress,
  });

  // Memoize message filtering and sorting to avoid expensive operations on every render
  const validMessages = useMemo(() => {
    return messages
      .filter((msg) => {
        if (!msg || typeof msg !== "object") {
          console.warn("Invalid message found:", msg);
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by created_at timestamp in ascending order (oldest first)
        try {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateA - dateB;
        } catch (error) {
          console.warn("Error sorting messages by date:", error);
          return 0; // Keep original order if date parsing fails
        }
      });
  }, [messages]);

  return (
    <>
      <div
        css={messageListStyle}
        ref={containerRef}
      >
        {hasMore && (
          <button
            css={loadMoreButtonStyle}
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <LoadingSpinner
                size="small"
                text="Loading"
              />
            ) : (
              "Load More Messages"
            )}
          </button>
        )}

        {validMessages.length > 0 ? (
          <>
            {validMessages.map((msg, index) => {
              const isLastMessage = index === validMessages.length - 1;
              const isAssistantMessage = msg.user_id === "assistant";
              const isEmptyMessage = msg.message === "";
              const shouldShowThinking =
                isEmptyMessage && isThinking && isLastMessage;
              const shouldShowSearching =
                webSearchStatus.isSearching && isThinking && isLastMessage;
              const shouldShowStreaming =
                isAssistantMessage &&
                isStreaming &&
                isLastMessage &&
                !isEmptyMessage;
              const shouldShowProgress =
                isAssistantMessage &&
                ((isLastMessage && progress !== null) ||
                  (msg.type === "pdf_choice" &&
                    msg.message.startsWith("You selected:") &&
                    progress !== null &&
                    pdfChoiceId === msg.id));

              if (msg.type === "pdf_choice") {
                console.log("Rendering pdf_choice button", handlePdfChoice);

                // Check if analysis is complete (message contains analysis result)
                const isAnalysisComplete =
                  msg.message.includes("Extracted Text (OCR):") ||
                  msg.message.includes("Analyzed as Image (Vision):") ||
                  msg.message.includes("AI analysis failed:") ||
                  msg.message.includes(
                    "Scanned PDF Detected\nExtracted Text (OCR):"
                  ) ||
                  // Check if message contains substantial content that indicates analysis is done
                  (msg.message.length > 200 &&
                    !msg.message.startsWith("You selected:")) ||
                  // Check for common analysis result patterns
                  msg.message.includes("This document appears to be") ||
                  msg.message.includes("Based on the document content") ||
                  msg.message.includes("The document contains") ||
                  msg.message.includes("Analysis of the scanned document") ||
                  // Check if message contains multiple paragraphs (indicates analysis result)
                  (msg.message.split("\n\n").length > 2 &&
                    msg.message.length > 100);

                // Check if analysis is in progress (progress is active)
                const isAnalysisInProgress =
                  progress !== null && pdfChoiceId === msg.id;

                // Hide buttons if analysis is complete or if user has made a choice
                const shouldHideButtons =
                  isAnalysisComplete || msg.message.startsWith("You selected:");

                return (
                  <div
                    key={msg.id || index}
                    css={assistantMessageStyle}
                  >
                    <div css={messageBubbleStyle(false)}>
                      {isAnalysisInProgress ? (
                        // Show progress dialog during analysis
                        <div css={thinkingStyle}>
                          <div>
                            <div>Document Analysis in Progress...</div>
                            <div css={progressBarContainerStyle}>
                              <div
                                css={progressBarStyle}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            {progressText && (
                              <AnimatedProgressText
                                key={progressText}
                                text={progressText}
                              />
                            )}
                            <div css={progressTextStyle}>
                              {progress}% complete
                            </div>
                            <div css={lightEffectStyle} />
                            <button
                              css={stopButtonStyle}
                              title={
                                isStopping ? "Stopping..." : "Stop analysis"
                              }
                              onClick={handleStopAnalysis}
                              disabled={isStopping}
                            >
                              {isStopping ? (
                                <>
                                  <div css={stoppingSpinnerStyle} />
                                  Stopping...
                                </>
                              ) : (
                                <>
                                  <FaStop size={12} />
                                  Stop
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Show normal PDF choice content
                        <>
                          <div style={{ marginBottom: 12 }}>
                            <strong>Scanned PDF Detected</strong>
                          </div>
                          <div style={{ marginBottom: 16 }}>{msg.message}</div>
                          {!shouldHideButtons && (
                            <div style={{ display: "flex", gap: 12 }}>
                              <button
                                style={{
                                  background:
                                    "linear-gradient(90deg,#3b82f6,#1d4ed8)",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 8,
                                  padding: "8px 18px",
                                  fontWeight: 600,
                                  fontSize: 15,
                                  cursor: "pointer",
                                }}
                                onClick={() => {
                                  console.log(
                                    "OCR button clicked",
                                    msg.id,
                                    handlePdfChoice
                                  );
                                  handlePdfChoice?.(msg.id, "ocr");
                                }}
                              >
                                Extract Text (OCR)
                              </button>
                              <button
                                style={{
                                  background:
                                    "linear-gradient(90deg,#f59e42,#f43f5e)",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 8,
                                  padding: "8px 18px",
                                  fontWeight: 600,
                                  fontSize: 15,
                                  cursor: "pointer",
                                }}
                                onClick={() => {
                                  console.log(
                                    "Vision button clicked",
                                    msg.id,
                                    handlePdfChoice
                                  );
                                  handlePdfChoice?.(msg.id, "vision");
                                }}
                              >
                                Analyze as Image (Vision Model)
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id || index}
                  css={
                    msg.user_id === "user"
                      ? userMessageStyle
                      : assistantMessageStyle
                  }
                >
                  <div css={messageBubbleStyle(msg.user_id === "user")}>
                    {shouldShowThinking || shouldShowSearching ? (
                      <div css={thinkingStyle}>
                        {progress !== null ? (
                          <div>
                            <div>Document Analysis in Progress...</div>
                            <div css={progressBarContainerStyle}>
                              <div
                                css={progressBarStyle}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            {progressText && (
                              <AnimatedProgressText
                                key={progressText}
                                text={progressText}
                              />
                            )}
                            <div css={progressTextStyle}>
                              {progress}% complete
                            </div>
                            <div css={lightEffectStyle} />
                            <button
                              css={stopButtonStyle}
                              title={
                                isStopping ? "Stopping..." : "Stop analysis"
                              }
                              onClick={handleStopAnalysis}
                              disabled={isStopping}
                            >
                              {isStopping ? (
                                <>
                                  <div css={stoppingSpinnerStyle} />
                                  Stopping...
                                </>
                              ) : (
                                <>
                                  <FaStop size={12} />
                                  Stop
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <AnimatedThinking
                            mode={
                              webSearchStatus.isSearching
                                ? "searching"
                                : "thinking"
                            }
                            searchTerms={webSearchStatus.searchTerms}
                          />
                        )}
                      </div>
                    ) : typeof msg.message === "string" ? (
                      <div>
                        {formatMessage(msg.message)}
                        {msg.files && <FileList files={msg.files} />}
                        {msg.web_search_sources &&
                          msg.web_search_sources.length > 0 && (
                            <SourcePills sources={msg.web_search_sources} />
                          )}
                        {shouldShowStreaming && (
                          <div css={streamingStyle}>●</div>
                        )}
                        {shouldShowProgress && (
                          <div css={progressContainerStyle}>
                            <div>Analysis in Progress...</div>
                            <div css={progressBarContainerStyle}>
                              <div
                                css={progressBarStyle}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            {progressText && (
                              <AnimatedProgressText
                                key={progressText}
                                text={progressText}
                              />
                            )}
                            <div css={progressTextStyle}>
                              {progress}% complete
                            </div>
                            <div css={lightEffectStyle} />
                            <button
                              css={stopButtonStyle}
                              title={
                                isStopping ? "Stopping..." : "Stop analysis"
                              }
                              onClick={handleStopAnalysis}
                              disabled={isStopping}
                            >
                              {isStopping ? (
                                <>
                                  <div css={stoppingSpinnerStyle} />
                                  Stopping...
                                </>
                              ) : (
                                <>
                                  <FaStop size={12} />
                                  Stop
                                </>
                              )}
                            </button>
                          </div>
                        )}
                        {msg.user_id === "user" && onAppendToInput && (
                          <button
                            css={enterButtonStyle}
                            title="Copy to input"
                            onClick={() => onAppendToInput(msg.message)}
                          >
                            <FaArrowDown size={8} />
                          </button>
                        )}
                      </div>
                    ) : (
                      "[Invalid message object]"
                    )}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div css={assistantMessageStyle}>
            <p>
              Welcome to Elara! I'm here to help you with your questions and
              document analysis.
            </p>
            <p>
              <strong>Features:</strong>
            </p>
            <ul>
              <li>💬 Chat with AI about any topic</li>
              <li>�� Upload and analyze documents (DOCX, PDF, TXT, etc.)</li>
              <li>🔒 Private chat sessions for sensitive conversations</li>
              <li>📚 Access to conversation history and summaries</li>
            </ul>
            <p>
              <strong>Privacy:</strong> This is currently a{" "}
              {isPrivate ? "private" : "public"} chat session.
              {!isPrivate && (
                <span>
                  Elara will automatically create memories of important
                  information you share. You can always edit/delete them in the
                  memories tab in the settings.
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      <MemoryNotification
        isVisible={memoryNotification.isVisible}
        message={memoryNotification.message}
        savedItems={memoryNotification.savedItems}
        onClose={handleMemoryNotificationClose}
      />
    </>
  );
}

// Memoize the component for performance optimization
export const MessageList = React.memo(MessageListComponent);

// Add display name for debugging
MessageList.displayName = "MessageList";
