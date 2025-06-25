/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useState, useEffect } from "react";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

const loaderContainerStyle = (size: string) => css`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: ${size === "sm" ? "0.5rem" : size === "md" ? "0.75rem" : "1rem"};
  width: 100%;
`;

const dotsContainerStyle = css`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.25rem;
`;

const dotStyle = (size: string, isActive: boolean, index: number) => css`
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: ${isActive ? "currentColor" : "rgba(156, 163, 175, 0.3)"};
  width: ${size === "sm" ? "4px" : size === "md" ? "6px" : "8px"};
  height: ${size === "sm" ? "4px" : size === "md" ? "6px" : "8px"};
  border-radius: 50%;
  animation: ${isActive ? "bounce 1.4s ease-in-out infinite" : "none"};
  animation-delay: ${index * 0.16}s;

  @media (prefers-color-scheme: dark) {
    background: ${isActive ? "currentColor" : "rgba(75, 85, 99, 0.3)"};
  }

  @keyframes bounce {
    0%,
    80%,
    100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% {
      transform: scale(1.2);
      opacity: 1;
    }
  }
`;

const textStyle = (size: string) => css`
  color: #6b7280;
  font-size: ${size === "sm"
    ? "0.875rem"
    : size === "md"
    ? "1rem"
    : "1.125rem"};
  font-weight: 500;
  letter-spacing: 0.025em;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

export function Loader({ size = "sm", className = "" }: LoaderProps) {
  const [dotStates, setDotStates] = useState([true, false, false]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotStates((prev) => {
        const newStates = [...prev];
        const activeIndex = newStates.findIndex((state) => state);
        newStates[activeIndex] = false;
        newStates[(activeIndex + 1) % 3] = true;
        return newStates;
      });
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      css={loaderContainerStyle(size)}
      className={className}
    >
      {/* Loading Text */}
      <span css={textStyle(size)}>Thinking</span>

      {/* Dancing Dots */}
      <div css={dotsContainerStyle}>
        <div css={dotStyle(size, dotStates[0], 0)} />
        <div css={dotStyle(size, dotStates[1], 1)} />
        <div css={dotStyle(size, dotStates[2], 2)} />
      </div>
    </div>
  );
}
