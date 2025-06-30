/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

const thinkingContainerStyle = css`
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-style: italic;
  overflow: hidden;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background: linear-gradient(
    90deg,
    rgba(59, 130, 246, 0.05) 0%,
    rgba(59, 130, 246, 0.1) 50%,
    rgba(59, 130, 246, 0.05) 100%
  );
`;

const thinkingTextStyle = css`
  position: relative;
  z-index: 2;
  color: #6b7280;
  font-weight: 500;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

const lightEffectStyle = css`
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(59, 130, 246, 0.2) 50%,
    transparent 100%
  );
  animation: lightSweep 2s ease-in-out infinite;
  z-index: 1;

  @keyframes lightSweep {
    0% {
      left: -100%;
    }
    50% {
      left: 100%;
    }
    100% {
      left: 100%;
    }
  }
`;

const dotsContainerStyle = css`
  display: flex;
  gap: 0.25rem;
  align-items: center;
`;

const dotStyle = css`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3b82f6;
  animation: bounce 1.4s ease-in-out infinite both;

  &:nth-of-type(1) {
    animation-delay: -0.32s;
  }

  &:nth-of-type(2) {
    animation-delay: -0.16s;
  }

  &:nth-of-type(3) {
    animation-delay: 0s;
  }

  @keyframes bounce {
    0%,
    80%,
    100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @media (prefers-color-scheme: dark) {
    background: #60a5fa;
  }
`;

export function AnimatedThinking() {
  return (
    <div css={thinkingContainerStyle}>
      <div css={lightEffectStyle} />
      <span css={thinkingTextStyle}>Thinking</span>
      <div css={dotsContainerStyle}>
        <div css={dotStyle} />
        <div css={dotStyle} />
        <div css={dotStyle} />
      </div>
    </div>
  );
}
