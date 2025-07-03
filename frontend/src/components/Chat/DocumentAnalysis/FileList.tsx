/** @jsxImportSource @emotion/react */
import React from "react";
import { getFileIcon, formatFileSize } from "../../../utils/fileUtils";
import type { FileInfo } from "../models";
import {
  fileDisplayStyle,
  fileItemStyle,
  fileIconStyle,
  fileNameStyle,
  fileSizeStyle,
} from "./FileListStyles";

interface FileListProps {
  files: FileInfo[];
}

export const FileList = React.memo<FileListProps>(function FileList({ files }) {
  if (!files || files.length === 0) {
    return null;
  }

  return (
    <div css={fileDisplayStyle}>
      {files.map((file, index) => (
        <div
          key={`${file.filename}-${index}`}
          css={fileItemStyle}
        >
          <div css={fileIconStyle}>
            {getFileIcon(file.type || "application/octet-stream")}
          </div>
          <div>
            <div css={fileNameStyle}>{file.filename}</div>
            <div css={fileSizeStyle}>{formatFileSize(file.size || 0)}</div>
          </div>
        </div>
      ))}
    </div>
  );
});
