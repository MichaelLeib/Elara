/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useState, useEffect } from "react";

const animatedProgressTextStyle = css`
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
  text-align: center;
  min-height: 1.25rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

const progressTextContentStyle = css`
  transition: opacity 0.3s ease, transform 0.3s ease;
  position: absolute;
  width: 100%;
  height: 100%;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const progressTextActiveStyle = css`
  opacity: 1;
  transform: translateY(0);
`;

const progressTextExitStyle = css`
  opacity: 0;
  transform: translateY(-10px);
`;

const loadingDotStyle = css`
  width: 4px;
  height: 4px;
  background: currentColor;
  border-radius: 50%;
  animation: loadingPulse 1.5s ease-in-out infinite;
  opacity: 0.6;

  @keyframes loadingPulse {
    0%,
    100% {
      opacity: 0.3;
      transform: scale(0.8);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.2);
    }
  }
`;

// Animated Progress Text Component
export const AnimatedProgressText = ({ text }: { text: string }) => {
  const [currentText, setCurrentText] = useState(text);
  const [displayText, setDisplayText] = useState(text);
  const [animationPhase, setAnimationPhase] = useState<
    "idle" | "exit" | "enter"
  >("idle");

  useEffect(() => {
    if (text !== currentText) {
      // Start exit animation
      setAnimationPhase("exit");

      // After exit animation, change text and start enter animation
      setTimeout(() => {
        setDisplayText(text);
        setCurrentText(text);
        setAnimationPhase("enter");

        // After enter animation, return to idle
        setTimeout(() => {
          setAnimationPhase("idle");
        }, 150);
      }, 150);
    }
  }, [text, currentText]);

  const getAnimationStyle = () => {
    switch (animationPhase) {
      case "exit":
        return progressTextExitStyle;
      case "enter":
        return progressTextActiveStyle;
      default:
        return progressTextActiveStyle;
    }
  };

  return (
    <div css={animatedProgressTextStyle}>
      <div css={[progressTextContentStyle, getAnimationStyle()]}>
        {displayText}
        <div css={loadingDotStyle} />
      </div>
    </div>
  );
};
