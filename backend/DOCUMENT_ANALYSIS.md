# Document Analysis Feature

This feature allows the Elara chat system to analyze various document types and answer questions about their content using AI.

## Supported File Types

- **DOCX** (.docx) - Microsoft Word documents
- **PDF** (.pdf) - Portable Document Format files
- **TXT** (.txt) - Plain text files
- **MD** (.md) - Markdown files
- **CSV** (.csv) - Comma-separated values files
- **JSON** (.json) - JavaScript Object Notation files
- **XML** (.xml) - Extensible Markup Language files
- **HTML** (.html, .htm) - HyperText Markup Language files

## Usage

### WebSocket API

Send a message with files through the WebSocket connection:

```json
{
  "message": "What are the main points in this document?",
  "model": "phi3:mini",
  "session_id": "optional-session-id",
  "isPrivate": true,
  "files": [
    {
      "filename": "document.docx",
      "content": "base64-encoded-file-content"
    },
    {
      "filename": "report.pdf",
      "content": "base64-encoded-file-content"
    }
  ]
}
```

### REST API

#### Analyze Documents

**POST** `/api/analyze-documents`

```json
{
  "files": [
    {
      "filename": "document.docx",
      "content": "base64-encoded-file-content"
    }
  ],
  "prompt": "What are the main points in this document?",
  "model": "phi3:mini"
}
```

Response:

```json
{
  "status": "success",
  "analysis": "The document discusses...",
  "documents_processed": 1,
  "method": "direct",
  "total_text_length": 1500,
  "chunks_analyzed": null
}
```

#### Get Supported File Types

**GET** `/api/supported-file-types`

Response:

```json
{
  "status": "success",
  "supported_types": [
    ".docx",
    ".pdf",
    ".txt",
    ".md",
    ".csv",
    ".json",
    ".xml",
    ".html",
    ".htm"
  ],
  "mime_types": {
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".csv": "text/csv",
    ".json": "application/json",
    ".xml": "application/xml",
    ".html": "text/html",
    ".htm": "text/html"
  }
}
```

## Features

### Automatic Chunking

For large documents that exceed the model's token limit, the system automatically:

1. Splits the document into manageable chunks
2. Analyzes each chunk separately
3. Combines the analyses into a comprehensive final answer

### Multi-Document Analysis

You can upload multiple documents at once and ask questions that span across all of them.

### Session Integration

Document analysis results are automatically saved to chat sessions, allowing for:

- Conversation history preservation
- Summary generation
- Context building for follow-up questions

### Error Handling

- Validates file types before processing
- Provides clear error messages for unsupported formats
- Handles encoding issues gracefully
- Cleans up temporary files automatically

## Installation

Install the required dependencies:

```bash
pip install python-docx PyPDF2 aiofiles
```

Or update your requirements.txt:

```
python-docx
PyPDF2
aiofiles
```

## Testing

Run the test script to verify the functionality:

```bash
cd backend
python test_document_analysis.py
```

## Best Practices

1. **File Size**: Keep individual files under 10MB for optimal performance
2. **Content Quality**: Ensure documents have readable text content
3. **Prompt Specificity**: Be specific in your questions for better analysis
4. **Multiple Documents**: When analyzing multiple documents, reference them specifically in your prompt
5. **Session Management**: Use session IDs to maintain context across multiple analyses

## Limitations

- PDF files with scanned images (non-text) may not be processed correctly
- Very large documents may take longer to process due to chunking
- Complex formatting in DOCX files may be simplified in the extracted text
- Binary files (images, executables) are not supported

## Security Considerations

- Files are processed in temporary directories and cleaned up automatically
- File content is not permanently stored on the server
- File type validation prevents execution of potentially harmful files
- All file operations are performed in isolated temporary directories
