/** @jsxImportSource @emotion/react */
import { useState } from "react";
import { FaChevronDown } from "react-icons/fa6";
import {
  accordionStyle,
  accordionHeaderStyle,
  accordionTitleStyle,
  accordionIconStyle,
  accordionContentStyle,
  accordionInnerStyle,
} from "./AccordionStyles";

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

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

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleAccordion();
    }
  };

  const accordionId = `accordion-${title.toLowerCase().replace(/\s+/g, "-")}`;
  const contentId = `${accordionId}-content`;

  return (
    <div
      css={accordionStyle}
      className={className}
    >
      <button
        css={accordionHeaderStyle}
        onClick={toggleAccordion}
        onKeyDown={handleKeyDown}
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        id={accordionId}
      >
        <h3 css={accordionTitleStyle}>{title}</h3>
        <FaChevronDown
          css={accordionIconStyle(isOpen)}
          size={16}
          aria-hidden="true"
        />
      </button>
      <div
        css={accordionContentStyle(isOpen)}
        id={contentId}
        role="region"
        aria-labelledby={accordionId}
        aria-hidden={!isOpen}
      >
        <div css={accordionInnerStyle}>{children}</div>
      </div>
    </div>
  );
}
