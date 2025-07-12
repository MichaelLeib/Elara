/** @jsxImportSource @emotion/react */
import React, { useMemo } from "react";
import type { Message } from "../models";
import { FaArrowDown, FaStop } from "react-icons/fa";
import {
  userMessageStyle,
  assistantMessageStyle,
  messageBubbleStyle,
  thinkingStyle,
  streamingStyle,
  progressBarContainerStyle,
  progressBarStyle,
  progressTextStyle,
  lightEffectStyle,
  stopButtonStyle,
  stoppingSpinnerStyle,
  progressContainerStyle,
  enterButtonStyle,
  progressBubbleStyle,
} from "./MessageListStyles";
import { AnimatedProgressText } from "../DocumentAnalysis/DocAnalysisProgress";
import { FileList } from "../DocumentAnalysis/FileList";
import { AnimatedThinking } from "./AnimatedThinking";
import SourcePills from "../../UI/SourcePills";
import { useUIStore } from "../../../store";

interface MessageItemProps {
  message: Message;
  isLastMessage: boolean;
  isThinking: boolean;
  onAppendToInput?: (text: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isLastMessage,
  isThinking,
  onAppendToInput,
}) => {
  const { progress, progressText, isStreaming, isStopping, webSearchStatus } =
    useUIStore();

  const handleStopAnalysis = () => {
    window.dispatchEvent(
      new CustomEvent("stop-analysis", {
        detail: { timestamp: Date.now() },
      })
    );
  };

  // Memoize computed values to avoid recalculating on every render
  const messageState = useMemo(() => {
    const isAssistantMessage = message.user_id === "assistant";
    const isEmptyMessage = message.message === "";
    const shouldShowThinking = isEmptyMessage && isThinking && isLastMessage;
    const shouldShowSearching =
      webSearchStatus.isSearching && isThinking && isLastMessage;
    const shouldShowStreaming =
      isAssistantMessage && isStreaming && isLastMessage && !isEmptyMessage;
    const shouldShowProgress =
      isAssistantMessage && isLastMessage && progress !== null;

    return {
      isAssistantMessage,
      isEmptyMessage,
      shouldShowThinking,
      shouldShowSearching,
      shouldShowStreaming,
      shouldShowProgress,
    };
  }, [
    message,
    isLastMessage,
    isThinking,
    isStreaming,
    progress,
    webSearchStatus.isSearching,
  ]);

  // Memoize the formatted message to avoid re-formatting on every render
  const formattedMessage = useMemo(() => {
    if (typeof message.message === "string") {
      return formatMessage(message.message);
    }
    return "[Invalid message object]";
  }, [message.message]);

  const handleAppendToInput = React.useCallback(
    (text: string) => {
      onAppendToInput?.(text);
    },
    [onAppendToInput]
  );

  // Use special wider bubble style for progress/thinking states
  const shouldShowProgressOrThinking =
    messageState.shouldShowThinking ||
    messageState.shouldShowSearching ||
    messageState.shouldShowProgress;
  const bubbleStyle = shouldShowProgressOrThinking
    ? progressBubbleStyle
    : messageBubbleStyle(message.user_id === "user");

  return (
    <div
      css={
        message.user_id === "user" ? userMessageStyle : assistantMessageStyle
      }
    >
      <div css={bubbleStyle}>
        {messageState.shouldShowThinking || messageState.shouldShowSearching ? (
          <div css={thinkingStyle}>
            {progress !== null ? (
              <div css={progressContainerStyle}>
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
                mode={webSearchStatus.isSearching ? "searching" : "thinking"}
                searchTerms={webSearchStatus.searchTerms}
              />
            )}
          </div>
        ) : typeof message.message === "string" ? (
          <div>
            {formattedMessage}
            {"files" in message && message.files && (
              <FileList files={message.files} />
            )}
            {"web_search_sources" in message &&
              message.web_search_sources &&
              message.web_search_sources.length > 0 && (
                <SourcePills sources={message.web_search_sources} />
              )}
            {messageState.shouldShowStreaming && (
              <div css={streamingStyle}>●</div>
            )}
            {messageState.shouldShowProgress && (
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
            {message.user_id === "user" && onAppendToInput && (
              <button
                css={enterButtonStyle}
                title="Copy to input"
                onClick={() => handleAppendToInput(message.message)}
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
};

// Helper function to format message text (extracted from MessageList)
function formatMessage(text: string): React.ReactNode {
  // Simple markdown-like formatting
  const lines = text.split("\n");
  return lines.map((line, index) => {
    if (line.startsWith("```") && line.endsWith("```")) {
      // Code block
      const code = line.slice(3, -3);
      return (
        <pre
          key={index}
          style={{
            background: "#f3f4f6",
            padding: "0.5rem",
            borderRadius: "0.25rem",
            overflow: "auto",
            fontSize: "0.875rem",
          }}
        >
          <code>{code}</code>
        </pre>
      );
    } else if (line.startsWith("**") && line.endsWith("**")) {
      // Bold text
      const boldText = line.slice(2, -2);
      return <strong key={index}>{boldText}</strong>;
    } else if (line.startsWith("*") && line.endsWith("*")) {
      // Italic text
      const italicText = line.slice(1, -1);
      return <em key={index}>{italicText}</em>;
    } else {
      return <span key={index}>{line}</span>;
    }
  });
}
