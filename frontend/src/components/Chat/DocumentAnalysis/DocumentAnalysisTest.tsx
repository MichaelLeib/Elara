/** @jsxImportSource @emotion/react */
import React, { useState } from "react";
import { ErrorBoundary } from "../../../ErrorBoundary";
import { SUPPORTED_FILE_TYPES, validateFiles } from "../../../utils/fileUtils";
import {
  testContainerStyle,
  testSectionStyle,
  titleStyle,
  fileListStyle,
  fileItemStyle,
  supportedStyle,
  unsupportedStyle,
  fileInputStyle,
} from "./DocumentAnalysisTestStyles";

export function DocumentAnalysisTest() {
  const [testFiles, setTestFiles] = useState<File[]>([]);
  const [validationResults, setValidationResults] = useState<{
    valid: File[];
    errors: string[];
  } | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setTestFiles(files);

    if (files.length > 0) {
      const results = validateFiles(files);
      setValidationResults(results);
    } else {
      setValidationResults(null);
    }
  };

  return (
    <ErrorBoundary>
      <div css={testContainerStyle}>
        <h1 css={titleStyle}>Document Analysis Test</h1>

        <div css={testSectionStyle}>
          <h2 css={titleStyle}>Supported File Types</h2>
          <ul css={fileListStyle}>
            {SUPPORTED_FILE_TYPES.map((type, index) => (
              <li
                key={index}
                css={fileItemStyle}
              >
                <span css={supportedStyle}>✓</span> {type}
              </li>
            ))}
          </ul>
        </div>

        <div css={testSectionStyle}>
          <h2 css={titleStyle}>File Validation Test</h2>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            accept={SUPPORTED_FILE_TYPES.join(",")}
            css={fileInputStyle}
          />

          {testFiles.length > 0 && (
            <div>
              <h3>Selected Files:</h3>
              <ul css={fileListStyle}>
                {testFiles.map((file, index) => (
                  <li
                    key={index}
                    css={fileItemStyle}
                  >
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validationResults && (
            <div>
              <h3>Validation Results:</h3>
              {validationResults.valid.length > 0 && (
                <div>
                  <h4 css={supportedStyle}>
                    Valid Files ({validationResults.valid.length}):
                  </h4>
                  <ul css={fileListStyle}>
                    {validationResults.valid.map((file, index) => (
                      <li
                        key={index}
                        css={fileItemStyle}
                      >
                        <span css={supportedStyle}>✓</span> {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResults.errors.length > 0 && (
                <div>
                  <h4 css={unsupportedStyle}>
                    Errors ({validationResults.errors.length}):
                  </h4>
                  <ul css={fileListStyle}>
                    {validationResults.errors.map((error, index) => (
                      <li
                        key={index}
                        css={fileItemStyle}
                      >
                        <span css={unsupportedStyle}>✗</span> {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div css={testSectionStyle}>
          <h2 css={titleStyle}>Usage Instructions</h2>
          <ol>
            <li>
              Drag and drop files onto the chat input area, or click the
              paperclip icon to select files
            </li>
            <li>Supported file types: {SUPPORTED_FILE_TYPES.join(", ")}</li>
            <li>Maximum file size: 10MB per file</li>
            <li>Type your question about the documents in the chat input</li>
            <li>
              Press Enter or click the send button to analyze the documents
            </li>
            <li>The AI will process your documents and answer your question</li>
          </ol>
        </div>
      </div>
    </ErrorBoundary>
  );
}
