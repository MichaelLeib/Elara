/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

const iconStyle = (size: number, color: string) => css`
  display: inline-block;
  width: ${size}px;
  height: ${size}px;
  color: ${color};
  font-size: ${size}px;
  line-height: 1;
  text-align: center;
`;

export function Icon({
  name,
  size = 16,
  color = "currentColor",
  className = "",
}: IconProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "close":
        return "×";
      case "add":
        return "+";
      case "plus":
        return "+";
      case "delete":
        return "🗑️";
      case "trash":
        return "🗑️";
      case "remove":
        return "🗑️";
      case "save":
        return "💾";
      case "download":
        return "⬇️";
      case "settings":
        return "⚙️";
      case "check":
        return "✓";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      case "chevron-down":
        return "⌄";
      case "enter":
        return "↵";
      case "arrow-down":
        return "↓";
      default:
        return iconName;
    }
  };

  return (
    <span
      css={iconStyle(size, color)}
      className={className}
    >
      {getIcon(name)}
    </span>
  );
}
