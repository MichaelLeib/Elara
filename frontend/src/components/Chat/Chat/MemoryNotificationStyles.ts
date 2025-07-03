/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

export const notificationContainerStyle = css`
  position: fixed;
  top: 2rem;
  right: 2rem;
  z-index: 1000;
  max-width: 400px;
  transform: translateX(100%);
  transition: transform 0.3s ease-in-out;
`;

export const notificationVisibleStyle = css`
  transform: translateX(0);
`;

export const notificationStyle = css`
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

export const iconStyle = css`
  flex-shrink: 0;
  font-size: 1.25rem;
`;

export const contentStyle = css`
  flex: 1;
`;

export const titleStyle = css`
  font-weight: 600;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const messageStyle = css`
  opacity: 0.9;
  line-height: 1.4;
`;

export const itemsListStyle = css`
  margin-top: 0.5rem;
  font-size: 0.75rem;
  opacity: 0.8;
`;

export const itemStyle = css`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.125rem;
`;

export const checkIconStyle = css`
  color: #a7f3d0;
  font-size: 0.75rem;
`;
