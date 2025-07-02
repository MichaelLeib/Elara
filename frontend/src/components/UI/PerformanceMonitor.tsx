/** @jsxImportSource @emotion/react */
import React, { useEffect, useRef, useState } from "react";
import { css } from "@emotion/react";

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  totalRenderTime: number;
}

interface PerformanceMonitorProps {
  componentName: string;
  enabled?: boolean;
  children: React.ReactNode;
}

const monitorStyle = css`
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  z-index: 9999;
  pointer-events: none;
`;

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  componentName,
  enabled = false,
  children,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    totalRenderTime: 0,
  });

  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();
    renderStartTime.current = startTime;

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      setMetrics((prev) => {
        const newRenderCount = prev.renderCount + 1;
        const newTotalRenderTime = prev.totalRenderTime + renderTime;
        const newAverageRenderTime = newTotalRenderTime / newRenderCount;

        return {
          renderCount: newRenderCount,
          lastRenderTime: renderTime,
          averageRenderTime: newAverageRenderTime,
          totalRenderTime: newTotalRenderTime,
        };
      });
    };
  });

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <div css={monitorStyle}>
        <div>{componentName}</div>
        <div>Renders: {metrics.renderCount}</div>
        <div>Last: {metrics.lastRenderTime.toFixed(2)}ms</div>
        <div>Avg: {metrics.averageRenderTime.toFixed(2)}ms</div>
      </div>
    </>
  );
};
