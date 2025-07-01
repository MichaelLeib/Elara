import React from "react";
import styled from "@emotion/styled";
import { FaGlobe, FaSearch } from "react-icons/fa";

interface WebSearchAnimationProps {
  searchTerms?: string;
  className?: string;
}

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.1) 0%,
    rgba(147, 197, 253, 0.1) 100%
  );
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-color-scheme: dark) {
    background: linear-gradient(
      135deg,
      rgba(59, 130, 246, 0.15) 0%,
      rgba(147, 197, 253, 0.1) 100%
    );
    border-color: rgba(59, 130, 246, 0.3);
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
  }
`;

const IconContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 50%;
  border: 2px solid rgba(59, 130, 246, 0.2);

  @media (prefers-color-scheme: dark) {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.4);
  }
`;

const GlobeIcon = styled(FaGlobe)`
  color: #3b82f6;
  font-size: 18px;
  animation: spin 2s linear infinite;

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const SearchIcon = styled(FaSearch)`
  position: absolute;
  top: -2px;
  right: -2px;
  color: #10b981;
  font-size: 12px;
  background: white;
  border-radius: 50%;
  padding: 2px;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
  }

  @media (prefers-color-scheme: dark) {
    background: #1f2937;
  }
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StatusText = styled.div`
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;

  @media (prefers-color-scheme: dark) {
    color: #f9fafb;
  }
`;

const SearchTerms = styled.div`
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

const Dots = styled.span`
  display: inline-block;
  animation: dots 1.5s infinite;

  @keyframes dots {
    0%,
    20% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
`;

const WebSearchAnimation: React.FC<WebSearchAnimationProps> = ({
  searchTerms,
  className,
}) => {
  return (
    <Container className={className}>
      <IconContainer>
        <GlobeIcon />
        <SearchIcon />
      </IconContainer>
      <Content>
        <StatusText>
          Searching the web<Dots>...</Dots>
        </StatusText>
        {searchTerms && <SearchTerms>"{searchTerms}"</SearchTerms>}
      </Content>
    </Container>
  );
};

export default WebSearchAnimation;
