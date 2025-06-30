/** @jsxImportSource @emotion/react */

import { css } from "@emotion/react";
import { FaFile } from "react-icons/fa";
import type { FileInfo } from "./models";

export function FileList({ files }: { files: FileInfo[] }) {
  if (!files || files.length === 0) return null;

  const fileDisplayStyle = css`
    margin-top: 0.75rem;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 0.5rem;
    border: 1px solid rgba(0, 0, 0, 0.1);

    @media (prefers-color-scheme: dark) {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
    }
  `;

  const fileItemStyle = css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    font-size: 0.875rem;
    color: white;

    @media (prefers-color-scheme: dark) {
      color: white;
    }
  `;

  const fileIconStyle = css`
    color: #3b82f6;
    flex-shrink: 0;
  `;

  const fileNameStyle = css`
    flex: 1;
    word-break: break-all;
  `;

  const fileSizeStyle = css`
    font-size: 0.75rem;
    color: #9ca3af;
    flex-shrink: 0;
  `;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div css={fileDisplayStyle}>
      <div
        css={css`
          font-size: 0.75rem;
          color: warm-gray-500;
          margin-bottom: 0.25rem;
        `}
      >
        📎 Attached files ({files.length}):
      </div>
      {files.map((file, index) => (
        <div
          key={index}
          css={fileItemStyle}
        >
          <FaFile
            css={fileIconStyle}
            size={12}
          />
          <span css={fileNameStyle}>{file.filename}</span>
          {file.size && (
            <span css={fileSizeStyle}>{formatFileSize(file.size)}</span>
          )}
        </div>
      ))}
    </div>
  );
}
