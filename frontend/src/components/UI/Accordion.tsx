/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useState } from "react";
import { Icon } from "./Icon";

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

const accordionStyle = css`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
`;

const accordionHeaderStyle = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f9fafb;
  cursor: pointer;
  border: none;
  width: 100%;
  text-align: left;
  transition: background-color 0.2s;

  &:hover {
    background: #f3f4f6;
  }

  @media (prefers-color-scheme: dark) {
    background: #374151;
    color: #d1d5db;

    &:hover {
      background: #4b5563;
    }
  }
`;

const accordionTitleStyle = css`
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;

  @media (prefers-color-scheme: dark) {
    color: #d1d5db;
  }
`;

const accordionIconStyle = (isOpen: boolean) => css`
  transition: transform 0.2s;
  transform: ${isOpen ? "rotate(180deg)" : "rotate(0deg)"};
  color: #6b7280;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

const accordionContentStyle = (isOpen: boolean) => css`
  max-height: ${isOpen ? "2000px" : "0"};
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
`;

const accordionInnerStyle = css`
  padding: 20px;
  border-top: 1px solid #e5e7eb;

  @media (prefers-color-scheme: dark) {
    border-top-color: #4b5563;
  }
`;

export function Accordion({
  title,
  children,
  defaultOpen = false,
  className = "",
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleAccordion = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      css={accordionStyle}
      className={className}
    >
      <button
        css={accordionHeaderStyle}
        onClick={toggleAccordion}
        type="button"
      >
        <h3 css={accordionTitleStyle}>{title}</h3>
        <Icon
          name="chevron-down"
          size={20}
          css={accordionIconStyle(isOpen)}
        />
      </button>
      <div css={accordionContentStyle(isOpen)}>
        <div css={accordionInnerStyle}>{children}</div>
      </div>
    </div>
  );
}
