/** @jsxImportSource @emotion/react */
import React from "react";
import { css } from "@emotion/react";

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  text?: string;
  color?: string;
}

const spinnerSizes = {
  small: "12px",
  medium: "16px",
  large: "20px",
};

const spinnerStyle = (size: string, color: string) => css`
  width: ${size};
  height: ${size};
  border: 2px solid transparent;
  border-top: 2px solid ${color};
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const containerStyle = css`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: inherit;
`;

const textStyle = css`
  font-weight: 500;
  letter-spacing: 0.5px;
`;

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "medium",
  text = "Loading",
  color = "currentColor",
}) => {
  const spinnerSize = spinnerSizes[size];

  return (
    <div css={containerStyle}>
      <div css={spinnerStyle(spinnerSize, color)} />
      {text && <span css={textStyle}>{text}</span>}
    </div>
  );
};

export default LoadingSpinner;
