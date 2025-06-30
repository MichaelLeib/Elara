# Elara - AI Chat Application

A modern AI chat application with local model support via Ollama, featuring comprehensive document analysis, conversation summarization, privacy controls, and intelligent memory management.

## 🌟 Features

### 💬 Chat Interface

- **Real-time AI conversations** with streaming responses via WebSocket
- **Multi-model support** with automatic model switching and manual selection
- **Message history persistence** with database storage
- **Session management** with public and private chat modes
- **Drag-and-drop file uploads** for document analysis
- **Progress tracking** for document analysis with real-time updates
- **Copy-to-input functionality** for easy message reuse
- **Responsive design** with dark/light mode support

### 📄 Document Analysis

- **Multi-format support**: DOCX, PDF, TXT, MD, CSV, JSON, XML, HTML
- **Batch processing** - analyze multiple documents simultaneously
- **Intelligent chunking** for large documents exceeding token limits
- **Real-time progress tracking** with percentage completion
- **File validation** with size and type checking (max 10MB per file)
- **Automatic text extraction** from various document formats
- **Context-aware analysis** with document-specific responses

### 🧠 AI Memory Management

- **Persistent memory storage** with key-value pairs
- **Cross-conversation context** for public chat sessions
- **Memory editing and deletion** with confirmation dialogs
- **Automatic saving** to `backend/storage/memory.json`
- **Context prioritization** with importance scoring
- **Category organization** for different types of information
- **Automatic user info extraction** from messages in public chats
- **Intelligent information categorization** (personal_info, occupation, hobbies, preferences, location, family, goals, constraints)
- **Confidence-based filtering** to ensure quality of extracted information

### 📊 Conversation Summarization

- **Automatic summarization** of every user-assistant exchange
- **Structured insights extraction** with key insights, action items, and context notes
- **Confidence scoring** (high/medium/low) for summary quality
- **Session-level summaries** for complete conversation analysis
- **Quality assessment** with follow-up recommendations
- **Database storage** for future reference and context building

### 🔒 Privacy Controls

- **Private chat sessions** with isolated context (no cross-session data)
- **Public chat sessions** with full context including summaries and memories
- **Session-level privacy settings** with visual indicators
- **Isolated document analysis** in private sessions
- **Secure file handling** with temporary processing and cleanup

### 🤖 Model Management

- **Hardware-aware recommendations** based on system specifications
- **One-click model downloads** with progress tracking
- **Model removal** with disk space management
- **Detailed model information** including strengths, weaknesses, and use cases
- **System requirements** and performance expectations
- **Automatic model detection** and status monitoring

### 🎛️ Settings & Configuration

- **Comprehensive settings dialog** accessible via gear icon
- **System information display** (CPU, RAM, platform)
- **Manual model switching** toggle
- **Timeout configuration** for model responses
- **Advanced settings** for power users
- **Real-time settings persistence**

### 🎨 User Interface

- **Modern React 19** with TypeScript for type safety
- **Emotion CSS-in-JS** for dynamic styling
- **Responsive design** with mobile support
- **Dark/light mode** with system preference detection
- **Error boundaries** for robust error handling
- **Loading states** with animated indicators
- **Accordion components** for organized information display
- **Confirmation dialogs** for destructive actions

### 📱 Side Panel Features

- **Collapsible chat history** with session management
- **New chat creation** with public/private options
- **Session deletion** with confirmation
- **Settings access** with comprehensive configuration
- **Auto-expand** on large screens for better UX

## 🚀 Available Models

### Text Models

- **llama3.2:1b** - Ultra-fast for real-time chat
- **llama3.2:3b** - Balanced performance and quality
- **llama3.2:8b** - Strong reasoning and document understanding
- **llama3.2:70b** - Exceptional capabilities for complex tasks

### Specialized Models

- **llava:7b** - Multimodal model for image analysis
- **codellama:7b** - Specialized for code generation and analysis
- **phi3:mini** - Fast and efficient for general use

## 💻 System Requirements

The application automatically detects your hardware and recommends appropriate models:

- **Low-end (2-4GB RAM)**: llama3.2:1b
- **Mid-range (4-8GB RAM)**: llama3.2:1b, llama3.2:3b
- **High-end (8-16GB RAM)**: llama3.2:3b, llama3.2:8b, llava:7b, codellama:7b
- **Workstation (16GB+ RAM)**: All models

## 🛠️ Installation

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+ and pip
- Ollama (for local model support)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Ollama Setup

1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Start Ollama service
3. Download your preferred models through the settings dialog

## 📖 Usage

### Getting Started

1. Start both backend and frontend servers
2. Open the application in your browser
3. Click the gear icon in the side panel to access settings
4. Add memory entries and download models as needed
5. Start chatting with your selected AI model

### Document Analysis

1. Drag and drop files onto the chat input area, or click the paperclip icon
2. Supported file types: DOCX, PDF, TXT, MD, CSV, JSON, XML, HTML
3. Maximum file size: 10MB per file
4. Type your question about the documents in the chat input
5. Press Enter or click the send button to analyze
6. Monitor progress with real-time updates

### Privacy Features

- **Private chats**: Isolated sessions with no cross-session data sharing
- **Public chats**: Full context including summaries and global memories
- **Document analysis**: Respects session privacy settings
- **Memory management**: Only affects public chat sessions
- **Automatic user info extraction**: Only occurs in public chat sessions
- **Intelligent filtering**: Only saves high-confidence or high-importance information

## 🔌 API Endpoints

### Health & System

- `GET /health` - Service health check
- `GET /api/system-info` - System hardware information
- `GET /api/settings` - Application configuration
- `GET /api/diagnostic` - Ollama connection and model status

### Memory Management

- `GET /api/memory` - Get memory entries
- `POST /api/memory` - Save memory entries
- `GET /api/user-info` - Get summary of extracted user information
- `POST /api/user-info/extract` - Manually extract user info from message
- `GET /api/user-info/categories` - Get user info organized by categories
- `DELETE /api/user-info/{key}` - Delete specific user info entry

### Model Management

- `GET /api/models/available` - Get available models with recommendations
- `GET /api/models` - Get installed models
- `GET /api/running-models` - Get currently running models
- `POST /api/models/download` - Download a model
- `DELETE /api/models/{model_name}` - Remove a model
- `GET /api/models/download-status/{model_name}` - Check download status
- `GET /api/model-info/{model_name}` - Get detailed model information

### Chat & Sessions

- `GET /api/chat-history` - Get chat history
- `WebSocket /api/chat` - Real-time chat endpoint
- `POST /api/chat-sessions` - Create new chat session
- `GET /api/chat-sessions/{session_id}/messages` - Get session messages
- `PUT /api/chat-sessions/{session_id}` - Update session
- `DELETE /api/chat-sessions/{session_id}` - Delete session

### Document Analysis

- `POST /api/analyze-documents` - Analyze documents with prompt
- `GET /api/supported-file-types` - Get supported file types

### Summarization

- `POST /api/summarize` - Generate conversation summary
- `POST /api/chat-sessions/{session_id}/summarize` - Generate session summary
- `GET /api/chat-sessions/{session_id}/summaries` - Get session summaries
- `GET /api/chat-sessions/{session_id}/summary` - Get latest session summary
- `GET /api/chat-sessions/{session_id}/insights` - Get session insights
- `GET /api/summaries/high-confidence` - Get high-confidence summaries

## 🏗️ Architecture

### Frontend

- **React 19** with TypeScript for type safety
- **Emotion** for CSS-in-JS styling
- **WebSocket** for real-time communication
- **Error boundaries** for robust error handling
- **Context API** for state management

### Backend

- **FastAPI** with Python for high-performance API
- **SQLite** database for data persistence
- **WebSocket** support for real-time chat
- **Async/await** patterns for non-blocking operations
- **Middleware** for CORS and exception handling

### AI Integration

- **Ollama** for local model inference
- **Multi-model support** with automatic fallbacks
- **Context building** with summaries and memories
- **Document processing** with multiple format support
- **User info extraction** with intelligent categorization and filtering

### Data Storage

- **SQLite database** for chat sessions, messages, and summaries
- **JSON files** for configuration and memory
- **Temporary file processing** for document analysis
- **Automatic cleanup** of temporary files

## 🔧 Development

### Code Structure

The application follows modern React patterns:

- **Functional components** with hooks
- **TypeScript** for type safety
- **Emotion** for CSS-in-JS styling
- **Modern async/await** patterns
- **Error boundaries** for robustness
- **Component composition** for reusability

### Key Components

- **Chat**: Main chat interface with message handling
- **MessageInput**: Input area with file upload and model selection
- **MessageList**: Message display with progress tracking
- **SidePane**: Chat history and settings access
- **SettingsDialog**: Comprehensive configuration interface
- **UI Components**: Reusable Button, Accordion, Loader components

### Testing

Run the test scripts to verify functionality:

```bash
# Backend tests
cd backend
python test_summarization.py
python test_privacy_chat.py
python test_document_analysis.py
python test_user_info_extraction.py

# Frontend tests
cd frontend
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the existing patterns
4. Test thoroughly with the provided test scripts
5. Submit a pull request with detailed description

## 📄 License

MIT License - see LICENSE file for details.

## 🔮 Future Enhancements

- **Semantic search** using embeddings for summary retrieval
- **Multi-language support** for international users
- **User preferences** for summary customization
- **Advanced file processing** with OCR capabilities
- **Plugin system** for extensible functionality
- **Mobile app** for iOS and Android
- **Collaborative features** for team usage
