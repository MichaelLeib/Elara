import React, { useState } from "react";
import styled from "@emotion/styled";

interface Source {
  title: string;
  url: string;
  snippet: string;
  favicon_url: string;
  domain: string;
}

interface SourcePillsProps {
  sources: Source[];
  className?: string;
}

const PillsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 0;
`;

const Pill = styled.div<{ isExpanded: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  max-width: ${(props) => (props.isExpanded ? "300px" : "200px")};
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px;
  color: #374151;

  &:hover {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.3);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
`;

const Favicon = styled.img`
  width: 16px;
  height: 16px;
  border-radius: 2px;
  flex-shrink: 0;
`;

const SourceName = styled.span`
  font-weight: 500;
  color: #1f2937;
  flex-shrink: 0;
`;

const SourceUrl = styled.span<{ isExpanded: boolean }>`
  color: #6b7280;
  font-size: 11px;
  margin-left: 4px;
  opacity: ${(props) => (props.isExpanded ? 1 : 0)};
  transition: opacity 0.2s ease;
  flex-shrink: 0;
`;

const Snippet = styled.div<{ isExpanded: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  opacity: ${(props) => (props.isExpanded ? 1 : 0)};
  visibility: ${(props) => (props.isExpanded ? "visible" : "hidden")};
  transition: all 0.2s ease;
  max-width: 300px;
  font-size: 12px;
  line-height: 1.4;
  color: #374151;
  white-space: normal;
  word-wrap: break-word;
`;

const PillWrapper = styled.div`
  position: relative;
`;

const SourcePills: React.FC<SourcePillsProps> = ({ sources, className }) => {
  const [expandedPill, setExpandedPill] = useState<number | null>(null);

  if (!sources || sources.length === 0) {
    return null;
  }

  const handlePillClick = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handlePillHover = (index: number) => {
    setExpandedPill(index);
  };

  const handlePillLeave = () => {
    setExpandedPill(null);
  };

  const getDomainName = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      return domain;
    } catch {
      return "Unknown";
    }
  };

  return (
    <PillsContainer className={className}>
      {sources.map((source, index) => (
        <PillWrapper key={index}>
          <Pill
            isExpanded={expandedPill === index}
            onClick={() => handlePillClick(source.url)}
            onMouseEnter={() => handlePillHover(index)}
            onMouseLeave={handlePillLeave}
            title={`${source.title} - ${source.url}`}
          >
            <Favicon
              src={source.favicon_url || "/default-favicon.png"}
              alt={getDomainName(source.url)}
              onError={(e) => {
                e.currentTarget.src = "/default-favicon.png";
              }}
            />
            <SourceName>{getDomainName(source.url)}</SourceName>
            {expandedPill === index && (
              <SourceUrl isExpanded={true}>• {source.url}</SourceUrl>
            )}
          </Pill>
          {expandedPill === index && (
            <Snippet isExpanded={true}>
              <strong>{source.title}</strong>
              <br />
              {source.snippet}
            </Snippet>
          )}
        </PillWrapper>
      ))}
    </PillsContainer>
  );
};

export default SourcePills;
