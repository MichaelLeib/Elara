/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import React, { useState } from "react";
import { ErrorBoundary } from "../../ErrorBoundary";
import { SUPPORTED_FILE_TYPES, validateFiles } from "../../utils/fileUtils";

const testContainerStyle = css`
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
`;

const testSectionStyle = css`
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: white;

  @media (prefers-color-scheme: dark) {
    background: #1e293b;
    border-color: #374151;
  }
`;

const titleStyle = css`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #1f2937;

  @media (prefers-color-scheme: dark) {
    color: #f1f5f9;
  }
`;

const fileListStyle = css`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const fileItemStyle = css`
  padding: 0.5rem;
  margin: 0.25rem 0;
  background: #f9fafb;
  border-radius: 0.5rem;
  font-family: monospace;
  font-size: 0.875rem;

  @media (prefers-color-scheme: dark) {
    background: #374151;
  }
`;

const supportedStyle = css`
  color: #059669;
  font-weight: 500;

  @media (prefers-color-scheme: dark) {
    color: #34d399;
  }
`;

const unsupportedStyle = css`
  color: #dc2626;
  font-weight: 500;

  @media (prefers-color-scheme: dark) {
    color: #f87171;
  }
`;

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
            style={{ marginBottom: "1rem" }}
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
