/** @jsxImportSource @emotion/react */
import React from "react";
import { buttonStyle } from "./ButtonStyles";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit" | "reset";
  className?: string;
}

export const Button = React.memo<ButtonProps>(function Button({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  size = "md",
  type = "button",
  className,
}) {
  return (
    <button
      css={buttonStyle(variant, size, disabled)}
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={className}
    >
      {children}
    </button>
  );
});
