/** @jsxImportSource @emotion/react */
import React, { useMemo } from "react";
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
import { useScrollManagement } from "../../../hooks/useScrollManagement.ts";
import type { Message, FileInfo, WebSearchSource } from "../models.ts";
import LoadingSpinner from "../../UI/LoadingSpinner.tsx";

interface MessageListProps {
  messages: Message[];
  isThinking?: boolean;
  onNewChat?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  isStreaming?: boolean;
  progress?: number | null;
  progressText?: string | null;
  isStopping?: boolean;
  pdfChoiceId?: string | null;
  webSearchStatus: {
    isSearching: boolean;
    searchTerms?: string;
  };
  onStopAnalysis?: () => void;
  memoryNotification: {
    isVisible: boolean;
    message: string;
    savedItems: Array<{
      key: string;
      value: string;
      action: string;
      reason: string;
    }>;
  };
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

// Component for progress/thinking states
const ProgressOrThinkingUI = ({
  progress,
  progressText,
  isStopping,
  onStopAnalysis,
  webSearchStatus,
}: {
  progress: number | null;
  progressText: string | null;
  isStopping: boolean;
  onStopAnalysis?: () => void;
  webSearchStatus: { isSearching: boolean; searchTerms?: string };
}) => (
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
        <div css={progressTextStyle}>{progress}% complete</div>
        <div css={lightEffectStyle} />
        <button
          css={stopButtonStyle}
          title={isStopping ? "Stopping..." : "Stop analysis"}
          onClick={onStopAnalysis}
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
        mode={webSearchStatus.isSearching ? "searching" : "thinking"}
        searchTerms={webSearchStatus.searchTerms}
      />
    )}
  </div>
);

// Component for PDF choice buttons
const PdfChoiceButtons = ({
  msgId,
  handlePdfChoice,
}: {
  msgId: string;
  handlePdfChoice?: (msgId: string, choice: "ocr" | "vision") => void;
}) => (
  <div style={{ display: "flex", gap: 12 }}>
    <button
      style={{
        background: "linear-gradient(90deg,#3b82f6,#1d4ed8)",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "8px 18px",
        fontWeight: 600,
        fontSize: 15,
        cursor: "pointer",
      }}
      onClick={() => {
        console.log("OCR button clicked", msgId, handlePdfChoice);
        handlePdfChoice?.(msgId, "ocr");
      }}
    >
      Extract Text (OCR)
    </button>
    <button
      style={{
        background: "linear-gradient(90deg,#f59e42,#f43f5e)",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "8px 18px",
        fontWeight: 600,
        fontSize: 15,
        cursor: "pointer",
      }}
      onClick={() => {
        console.log("Vision button clicked", msgId, handlePdfChoice);
        handlePdfChoice?.(msgId, "vision");
      }}
    >
      Analyze as Image (Vision Model)
    </button>
  </div>
);

// Component for regular message content
const RegularMessageContent = ({
  message,
  files,
  web_search_sources,
  shouldShowStreaming,
  shouldShowProgress,
  progress,
  progressText,
  isStopping,
  onStopAnalysis,
  user_id,
  onAppendToInput,
}: {
  message: string;
  files?: FileInfo[];
  web_search_sources?: WebSearchSource[];
  shouldShowStreaming: boolean;
  shouldShowProgress: boolean;
  progress: number | null;
  progressText: string | null;
  isStopping: boolean;
  onStopAnalysis?: () => void;
  user_id: string;
  onAppendToInput?: (text: string) => void;
}) => (
  <>
    {formatMessage(message)}
    {files && <FileList files={files} />}
    {web_search_sources && web_search_sources.length > 0 && (
      <SourcePills sources={web_search_sources} />
    )}
    {shouldShowStreaming && <div css={streamingStyle}>●</div>}
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
        <div css={progressTextStyle}>{progress}% complete</div>
        <div css={lightEffectStyle} />
        <button
          css={stopButtonStyle}
          title={isStopping ? "Stopping..." : "Stop analysis"}
          onClick={onStopAnalysis}
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
    {user_id === "user" && onAppendToInput && (
      <button
        css={enterButtonStyle}
        title="Copy to input"
        onClick={() => onAppendToInput(message)}
      >
        <FaArrowDown size={8} />
      </button>
    )}
  </>
);

// Helper function to check if PDF analysis is complete
const isPdfAnalysisComplete = (message: string): boolean => {
  return (
    message.includes("Extracted Text (OCR):") ||
    message.includes("Analyzed as Image (Vision):") ||
    message.includes("AI analysis failed:") ||
    message.includes("Scanned PDF Detected\nExtracted Text (OCR):") ||
    // Check if message contains substantial content that indicates analysis is done
    (message.length > 200 && !message.startsWith("You selected:")) ||
    // Check for common analysis result patterns
    message.includes("This document appears to be") ||
    message.includes("Based on the document content") ||
    message.includes("The document contains") ||
    message.includes("Analysis of the scanned document") ||
    // Check if message contains multiple paragraphs (indicates analysis result)
    (message.split("\n\n").length > 2 && message.length > 100)
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
  isStreaming = false,
  progress = null,
  progressText = null,
  isStopping = false,
  pdfChoiceId = null,
  webSearchStatus,
  onStopAnalysis,
  memoryNotification,
}: MessageListProps) {
  const handleStopAnalysis = () => {
    onStopAnalysis?.();
  };

  const handleMemoryNotificationClose = () => {
    // This function is called when the memory notification is closed
    // The actual state management should be handled by the parent component
    console.log("Memory notification closed");
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
              const isPdfChoiceMessage = msg.type === "pdf_choice";

              // Unified state calculations
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
                  (isPdfChoiceMessage &&
                    msg.message.startsWith("You selected:") &&
                    progress !== null &&
                    pdfChoiceId === msg.id));

              // PDF-specific state calculations
              const isAnalysisComplete =
                isPdfChoiceMessage && isPdfAnalysisComplete(msg.message);
              const isAnalysisInProgress =
                progress !== null && pdfChoiceId === msg.id;
              const shouldHideButtons =
                isPdfChoiceMessage &&
                (isAnalysisComplete || msg.message.startsWith("You selected:"));

              // Determine message styling
              const messageStyle = isPdfChoiceMessage
                ? assistantMessageStyle
                : msg.user_id === "user"
                ? userMessageStyle
                : assistantMessageStyle;

              const bubbleStyle = messageBubbleStyle(msg.user_id === "user");

              // Check if we should show progress/thinking states
              const shouldShowProgressOrThinking =
                shouldShowThinking ||
                shouldShowSearching ||
                isAnalysisInProgress;

              return (
                msg.message && (
                  <div
                    key={msg.id || index}
                    css={messageStyle}
                  >
                    <div css={bubbleStyle}>
                      {shouldShowProgressOrThinking ? (
                        <ProgressOrThinkingUI
                          progress={progress}
                          progressText={progressText}
                          isStopping={isStopping}
                          onStopAnalysis={handleStopAnalysis}
                          webSearchStatus={webSearchStatus}
                        />
                      ) : typeof msg.message === "string" ? (
                        <div>
                          {/* PDF Choice Message Content */}
                          {isPdfChoiceMessage && !isAnalysisInProgress && (
                            <>
                              <div style={{ marginBottom: 12 }}>
                                <strong>Scanned PDF Detected</strong>
                              </div>
                              <div style={{ marginBottom: 16 }}>
                                {msg.message}
                              </div>
                              {!shouldHideButtons && (
                                <PdfChoiceButtons
                                  msgId={msg.id}
                                  handlePdfChoice={handlePdfChoice}
                                />
                              )}
                            </>
                          )}

                          {/* Regular Message Content */}
                          {!isPdfChoiceMessage && (
                            <RegularMessageContent
                              message={msg.message}
                              files={msg.files}
                              web_search_sources={msg.web_search_sources}
                              shouldShowStreaming={shouldShowStreaming}
                              shouldShowProgress={shouldShowProgress}
                              progress={progress}
                              progressText={progressText}
                              isStopping={isStopping}
                              onStopAnalysis={handleStopAnalysis}
                              user_id={msg.user_id}
                              onAppendToInput={onAppendToInput}
                            />
                          )}

                          {/* Show analysis result for PDF choice messages */}
                          {isPdfChoiceMessage &&
                            (isAnalysisComplete || isAnalysisInProgress) && (
                              <>
                                {formatMessage(msg.message)}
                                {msg.files && <FileList files={msg.files} />}
                                {msg.web_search_sources &&
                                  msg.web_search_sources.length > 0 && (
                                    <SourcePills
                                      sources={msg.web_search_sources}
                                    />
                                  )}
                              </>
                            )}
                        </div>
                      ) : (
                        "[Invalid message object]"
                      )}
                    </div>
                  </div>
                )
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
              <li>📄 Upload and analyze documents (DOCX, PDF, TXT, etc.)</li>
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
