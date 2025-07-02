/** @jsxImportSource @emotion/react */
import React from "react";
import {
  thinkingContainerStyle,
  searchingContainerStyle,
  thinkingTextStyle,
  searchingTextStyle,
  searchTermsStyle,
  lightEffectStyle,
  searchingLightEffectStyle,
  dotsContainerStyle,
  dotStyle,
  searchingDotStyle,
} from "./AnimatedThinkingStyles";

interface AnimatedThinkingProps {
  mode?: "thinking" | "searching";
  searchTerms?: string;
}

export const AnimatedThinking = React.memo(function AnimatedThinking({
  mode = "thinking",
  searchTerms,
}: AnimatedThinkingProps) {
  const isSearching = mode === "searching";
  const containerStyle = isSearching
    ? searchingContainerStyle
    : thinkingContainerStyle;
  const textStyle = isSearching ? searchingTextStyle : thinkingTextStyle;
  const lightEffect = isSearching
    ? searchingLightEffectStyle
    : lightEffectStyle;
  const dotStyleToUse = isSearching ? searchingDotStyle : dotStyle;
  const text = isSearching ? "Searching the web" : "Thinking";

  return (
    <div css={containerStyle}>
      <div css={lightEffect} />
      <span css={textStyle}>{text}</span>
      <div css={dotsContainerStyle}>
        <div css={dotStyleToUse} />
        <div css={dotStyleToUse} />
        <div css={dotStyleToUse} />
      </div>
      {isSearching && searchTerms && (
        <span css={searchTermsStyle}>"{searchTerms}"</span>
      )}
    </div>
  );
});
