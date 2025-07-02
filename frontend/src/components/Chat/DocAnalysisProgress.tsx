/** @jsxImportSource @emotion/react */
import { useState, useEffect } from "react";
import {
  animatedProgressTextStyle,
  progressTextContentStyle,
  progressTextActiveStyle,
  progressTextExitStyle,
  loadingDotStyle,
} from "./DocAnalysisProgressStyles";

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
