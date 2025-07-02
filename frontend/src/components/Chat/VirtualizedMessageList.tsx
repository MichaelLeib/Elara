/** @jsxImportSource @emotion/react */
import React, {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import type { Message } from "./models";
import { MessageItem } from "./MessageItem";
import { css } from "@emotion/react";
import { VariableSizeList as List } from "react-window";

interface VirtualizedMessageListProps {
  messages: Message[];
  isThinking: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onAppendToInput?: (text: string) => void;
}

const ROW_GAP = 12;
const LOAD_MORE_ROW_HEIGHT = 60;
const DEFAULT_ROW_HEIGHT = 80;

const containerStyle = css`
  height: 100%;
  overflow-y: auto;
  position: relative;
`;

export const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  isThinking,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  onAppendToInput,
}) => {
  // Add a "load more" row at the top if hasMore
  const items = useMemo(
    () => (hasMore ? ["__load_more__", ...messages] : [...messages]),
    [hasMore, messages]
  );
  const listRef = useRef<List>(null);
  const [rowHeights, setRowHeights] = useState<{ [key: number]: number }>({});
  const measureRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [measuringIndex, setMeasuringIndex] = useState<number | null>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(items.length - 1, "end");
    }
  }, [items.length]);

  // Find the first row that needs measurement
  useEffect(() => {
    for (let i = 0; i < items.length; i++) {
      if (items[i] !== "__load_more__" && rowHeights[i] === undefined) {
        setMeasuringIndex(i);
        return;
      }
    }
    setMeasuringIndex(null);
  }, [items, rowHeights]);

  // After rendering the measurement row, measure and cache its height
  useEffect(() => {
    if (measuringIndex !== null && measureRefs.current[measuringIndex]) {
      const el = measureRefs.current[measuringIndex];
      const height = el.getBoundingClientRect().height;
      setRowHeights((prev) => {
        if (prev[measuringIndex] !== height) {
          if (listRef.current) {
            listRef.current.resetAfterIndex(measuringIndex);
          }
          return { ...prev, [measuringIndex]: height };
        }
        return prev;
      });
    }
  }, [measuringIndex]);

  // Row height getter for VariableSizeList
  const getItemSize = useCallback(
    (index: number) => {
      if (items[index] === "__load_more__") return LOAD_MORE_ROW_HEIGHT;
      return rowHeights[index] || DEFAULT_ROW_HEIGHT;
    },
    [items, rowHeights]
  );

  // Row renderer
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      if (items[index] === "__load_more__") {
        return (
          <div
            style={{
              ...style,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 8,
            }}
          >
            <button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              css={css`
                padding: 0.5rem 1.25rem;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 0.75rem;
                font-size: 1rem;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
                cursor: pointer;
                transition: background 0.2s;
                &:hover:not(:disabled) {
                  background: #2563eb;
                }
                &:disabled {
                  background: #9ca3af;
                  cursor: not-allowed;
                }
              `}
            >
              {isLoadingMore ? "Loading..." : "Load More Messages"}
            </button>
          </div>
        );
      }
      // If height is not known, render a placeholder
      if (rowHeights[index] === undefined) {
        return (
          <div
            style={{
              ...style,
              height: DEFAULT_ROW_HEIGHT,
              background: "#f3f4f6",
            }}
          />
        );
      }
      // Render the real message
      return (
        <div
          style={{
            ...style,
            display: "flex",
            flexDirection: "column",
            gap: ROW_GAP,
          }}
        >
          <MessageItem
            message={items[index] as Message}
            isLastMessage={index === items.length - 1}
            isThinking={isThinking && index === items.length - 1}
            onAppendToInput={onAppendToInput}
          />
        </div>
      );
    },
    [items, isThinking, isLoadingMore, onLoadMore, onAppendToInput, rowHeights]
  );

  // Render a hidden measurement row for the current measuringIndex
  const MeasurementRow =
    measuringIndex !== null ? (
      <div
        ref={(el) => (measureRefs.current[measuringIndex] = el)}
        style={{
          position: "absolute",
          visibility: "hidden",
          zIndex: -1,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: ROW_GAP }}>
          <MessageItem
            message={items[measuringIndex] as Message}
            isLastMessage={measuringIndex === items.length - 1}
            isThinking={isThinking && measuringIndex === items.length - 1}
            onAppendToInput={onAppendToInput}
          />
        </div>
      </div>
    ) : null;

  return (
    <div css={containerStyle}>
      <List
        ref={listRef}
        height={window.innerHeight * 0.7}
        width={"100%"}
        itemCount={items.length}
        itemSize={getItemSize}
        overscanCount={4}
        style={{ background: "none" }}
      >
        {Row}
      </List>
      {MeasurementRow}
    </div>
  );
};
