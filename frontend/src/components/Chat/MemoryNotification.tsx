/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useEffect } from "react";
import { FaBrain, FaCheck } from "react-icons/fa";

interface MemoryNotificationProps {
  isVisible: boolean;
  message: string;
  savedItems: Array<{
    key: string;
    value: string;
    action: string;
    reason: string;
  }>;
  onClose: () => void;
}

const notificationContainerStyle = css`
  position: fixed;
  top: 2rem;
  right: 2rem;
  z-index: 1000;
  max-width: 400px;
  transform: translateX(100%);
  transition: transform 0.3s ease-in-out;
`;

const notificationVisibleStyle = css`
  transform: translateX(0);
`;

const notificationStyle = css`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const iconStyle = css`
  flex-shrink: 0;
  font-size: 1.25rem;
`;

const contentStyle = css`
  flex: 1;
`;

const titleStyle = css`
  font-weight: 600;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const messageStyle = css`
  opacity: 0.9;
  line-height: 1.4;
`;

const itemsListStyle = css`
  margin-top: 0.5rem;
  font-size: 0.75rem;
  opacity: 0.8;
`;

const itemStyle = css`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.125rem;
`;

const checkIconStyle = css`
  color: #a7f3d0;
  font-size: 0.75rem;
`;

export function MemoryNotification({
  isVisible,
  message,
  savedItems,
  onClose,
}: MemoryNotificationProps) {
  useEffect(() => {
    if (isVisible) {
      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      css={[notificationContainerStyle, isVisible && notificationVisibleStyle]}
    >
      <div css={notificationStyle}>
        <div css={iconStyle}>
          <FaBrain />
        </div>
        <div css={contentStyle}>
          <div css={titleStyle}>
            <FaCheck css={checkIconStyle} />
            Memory Updated
          </div>
          <div css={messageStyle}>{message}</div>
          {savedItems.length > 0 && (
            <div css={itemsListStyle}>
              {savedItems.slice(0, 3).map((item, index) => (
                <div
                  key={index}
                  css={itemStyle}
                >
                  <FaCheck css={checkIconStyle} />
                  {item.key}: {item.value}
                </div>
              ))}
              {savedItems.length > 3 && (
                <div css={itemStyle}>
                  <FaCheck css={checkIconStyle} />+{savedItems.length - 3} more
                  items
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
