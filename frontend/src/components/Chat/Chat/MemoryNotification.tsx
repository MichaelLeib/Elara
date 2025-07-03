/** @jsxImportSource @emotion/react */
import React, { useEffect } from "react";
import { FaBrain, FaCheck } from "react-icons/fa";
import {
  notificationContainerStyle,
  notificationVisibleStyle,
  notificationStyle,
  iconStyle,
  contentStyle,
  titleStyle,
  messageStyle,
  itemsListStyle,
  itemStyle,
  checkIconStyle,
} from "./MemoryNotificationStyles";

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

export const MemoryNotification = React.memo(function MemoryNotification({
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
});
