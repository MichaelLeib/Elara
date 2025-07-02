/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

export const overlayStyle = css`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

export const settingsDialogStyle = css`
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 90vw;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  @media (prefers-color-scheme: dark) {
    background: #1e293b;
  }
`;

export const settingsHeaderStyle = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 12px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;

  @media (prefers-color-scheme: dark) {
    border-bottom: 1px solid #334155;
    background: #1e293b;
  }
`;

export const emptyStateStyle = css`
  padding: 16px;
  text-align: center;
  color: #9ca3af;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
    background: #1e293b;
  }
`;

export const titleStyle = css`
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

export const closeButtonStyle = css`
  background: none;
  border: none;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  border-radius: 4px;
  transition: color 0.2s;

  &:hover {
    color: #374151;
  }
`;

export const contentStyle = css`
  flex: 1;
  overflow-y: auto;
  padding: 0px 24px 24px 24px;
`;

export const memoryListStyle = css`
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
`;

export const memoryItemStyle = css`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: white;

  &:last-child {
    border-bottom: none;
  }

  @media (prefers-color-scheme: dark) {
    background: #1e293b;
    border-bottom: 1px solid #334155;
  }
`;

export const inputStyle = css`
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

export const iconButtonStyle = css`
  background: none;
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;

  &:hover {
    background-color: #f3f4f6;
  }
`;

export const addButtonStyle = css`
  margin-top: 12px;
  width: 100%;
`;

export const modelsListStyle = css`
  max-height: 400px;
  overflow-y: auto;
`;

export const modelCardStyle = css`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  background: white;
  transition: border-color 0.2s;

  &:hover {
    border-color: #3b82f6;
  }

  @media (prefers-color-scheme: dark) {
    background: #1e293b;
    border: 1px solid #334155;
  }
`;

export const modelHeaderStyle = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

export const modelNameStyle = css`
  font-weight: 600;
  color: #1f2937;
  font-size: 16px;

  @media (prefers-color-scheme: dark) {
    color: #f1f5f9;
  }
`;

export const modelSizeStyle = css`
  color: #6b7280;
  font-size: 14px;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

export const modelActionsStyle = css`
  display: flex;
  gap: 8px;
`;

export const statusStyle = css`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
`;

export const statusDownloadedStyle = css`
  ${statusStyle}
  background: #dcfce7;
  color: #166534;

  @media (prefers-color-scheme: dark) {
    background: #166534;
    color: #dcfce7;
  }
`;

export const statusNotDownloadedStyle = css`
  ${statusStyle}
  background: #fef3c7;
  color: #92400e;

  @media (prefers-color-scheme: dark) {
    background: #92400e;
    color: #fef3c7;
  }
`;

export const statusDownloadingStyle = css`
  ${statusStyle}
  background: #dbeafe;
  color: #1e40af;

  @media (prefers-color-scheme: dark) {
    background: #1e40af;
    color: #dbeafe;
  }
`;

export const systemInfoStyle = css`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;

  @media (prefers-color-scheme: dark) {
    background: #1e293b;
    border: 1px solid #334155;
  }
`;

export const systemInfoTitleStyle = css`
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;

  @media (prefers-color-scheme: dark) {
    color: #f1f5f9;
  }
`;

export const systemInfoItemStyle = css`
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 14px;
`;

export const systemInfoLabelStyle = css`
  color: #6b7280;
  font-weight: 500;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
`;

export const systemInfoValueStyle = css`
  color: #1f2937;
  font-family: monospace;

  @media (prefers-color-scheme: dark) {
    color: #f1f5f9;
  }
`;
