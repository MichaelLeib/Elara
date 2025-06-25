/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit" | "reset";
  className?: string;
}

const buttonStyle = (variant: string, size: string, disabled: boolean) => css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  font-weight: 600;
  font-family: inherit;
  cursor: ${disabled ? "not-allowed" : "pointer"};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  letter-spacing: 0.025em;
  position: relative;
  overflow: hidden;

  ${size === "sm"
    ? `
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    min-height: 2.25rem;
  `
    : size === "md"
    ? `
    padding: 0.75rem 1.5rem;
    font-size: 0.95rem;
    min-height: 2.75rem;
  `
    : `
    padding: 1rem 2rem;
    font-size: 1.125rem;
    min-height: 3.25rem;
  `}

  ${variant === "primary"
    ? `
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
    }
    
    &:disabled {
      background: #d1d5db;
      box-shadow: none;
      transform: none;
      opacity: 0.5;
    }
  `
    : variant === "secondary"
    ? `
    background: rgba(255, 255, 255, 0.9);
    color: #374151;
    border: 1px solid rgba(0, 0, 0, 0.08);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    backdrop-filter: blur(8px);
    
    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 1);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    
    &:disabled {
      background: rgba(0, 0, 0, 0.05);
      color: #9ca3af;
      box-shadow: none;
      transform: none;
      opacity: 0.5;
    }
  `
    : `
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
    }
    
    &:disabled {
      background: #fca5a5;
      box-shadow: none;
      transform: none;
      opacity: 0.5;
    }
  `}
  
  @media (prefers-color-scheme: dark) {
    ${variant === "secondary"
      ? `
      background: rgba(30, 41, 59, 0.9);
      color: #e5e7eb;
      border: 1px solid rgba(255, 255, 255, 0.1);
      
      &:hover:not(:disabled) {
        background: rgba(30, 41, 59, 1);
      }
      
      &:disabled {
        background: rgba(255, 255, 255, 0.05);
        color: #6b7280;
      }
    `
      : ""}
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  }

  &:focus:not(:focus-visible) {
    box-shadow: none;
  }
`;

export function Button({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      css={buttonStyle(variant, size, disabled)}
      className={className}
    >
      {children}
    </button>
  );
}
