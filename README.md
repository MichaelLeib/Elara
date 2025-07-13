# Elara - AI Chat Application

A modern AI chat application with local model support via Ollama, featuring comprehensive document analysis, **image analysis**, conversation summarization, privacy controls, and intelligent memory management.

## 🌟 Features

### 💬 Chat Interface

- **Real-time AI conversations** with streaming responses via WebSocket
- **Multi-model support** with automatic model switching and manual selection
- **Message history persistence** with database storage
- **Session management** with public and private chat modes
- **Drag-and-drop file uploads** for document and **image analysis**
- **Progress tracking** for document and **image analysis** with real-time updates
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

### 🖼️ Image Analysis

- **Multi-format support**: JPG, PNG, GIF, BMP, WebP, TIFF
- **Intelligent analysis strategies** based on user prompt intent
- **Automatic image processing** with scaling and splitting for large images
- **Vision model integration** with llava:7b, llava:13b, bakllava:7b, and more
- **Smart prompt analysis** to determine global overview vs detailed search
- **Batch image processing** - analyze multiple images simultaneously
- **Real-time progress tracking** with detailed status updates
- **Mixed content analysis** - combine documents and images in single requests
- **Automatic model selection** with fallback to best available vision model
- **Image optimization** for optimal vision model performance

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
- **Isolated document and image analysis** in private sessions
- **Secure file handling** with temporary processing and cleanup

### 🤖 Model Management

- **Hardware-aware recommendations** based on system specifications
- **One-click model downloads** with progress tracking
- **Model removal** with disk space management
- **Detailed model information** including strengths, weaknesses, and use cases
- **System requirements** and performance expectations
- **Automatic model detection** and status monitoring
- **Vision model support** for image analysis capabilities

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




> **🚀 Easiest way to try Elara:**
>
> ```bash
> git clone https://github.com/yourusername/elara.git
> cd elara
> chmod +x install.sh download-models.sh
> ./install.sh
> ./download-models.sh
> # Then open http://localhost:5173 in your browser
> ```

---

## 🧑‍💻 Try it with Docker (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/elara.git
   cd elara
   ```
2. **Run the install script:**
   ```bash
   chmod +x install.sh
   ./install.sh
   ```
3. **Download recommended AI models:**
   ```bash
   chmod +x download-models.sh
   ./download-models.sh
   ```
4. **Open your browser:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000

> **Tip:** If you are on Mac/Windows, make sure Docker Desktop is running and has at least 8GB RAM allocated (see Docker Desktop > Settings > Resources).

- **codellama:7b** - Specialized for code generation and analysis
- **phi3:mini** - Fast and efficient for general use

## 💻 System Requirements

The application automatically detects your hardware and recommends appropriate models:

- **Low-end (2-4GB RAM)**: llama3.2:1b
- **Mid-range (4-8GB RAM)**: llama3.2:1b, llama3.2:3b
- **High-end (8-16GB RAM)**: llama3.2:3b, llama3.2:8b, llava:7b, codellama:7b
- **Workstation (16GB+ RAM)**: All models including llava:13b, llava:34b
---

## 🛠️ Installation
## 🛑 Stopping and Cleaning Up

- To stop all services:
  ```bash
  docker-compose down
  ```
- To view logs:
  ```bash
  docker-compose logs -f
  ```

---

## 🛠️ Manual Installation

### Prerequisites

@@ -149,7 +64,12 @@ The application automatically detects your hardware and recommends appropriate m
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# Install system dependencies (Ubuntu/Debian)
sudo apt-get install poppler-utils tesseract-ocr

# Start backend
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
@@ -164,215 +84,54 @@ npm run dev

1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Start Ollama service
3. Download your preferred models through the settings dialog
4. **For image analysis**: Install vision models like `llava:7b`:
   ```bash
   ollama pull llava:7b
   ```

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

### Image Analysis

1. **Upload Images**: Drag and drop image files onto the chat input area, or click the paperclip icon
2. **Supported Formats**: JPG, PNG, GIF, BMP, WebP, TIFF
3. **File Size Limit**: Maximum 10MB per image
4. **Write Your Question**: Type what you want to know about the image(s)
5. **Smart Analysis**: The system automatically determines the best analysis strategy:
   - **Global Overview**: For prompts like "describe what you see" or "what is this image about"
   - **Detailed Search**: For prompts like "find all text" or "locate specific objects"
   - **Combined Analysis**: For complex requests requiring both overview and detail
6. **Automatic Processing**: Large images are automatically scaled or split for optimal analysis
7. **Real-time Progress**: Monitor analysis progress with detailed status updates
8. **Mixed Content**: Upload both documents and images for combined analysis

### Image Analysis Examples

- **"Describe what you see in this image"** - Global overview analysis
- **"Find all the text in this image"** - Detailed text detection
- **"What objects are visible in this scene?"** - Object identification
- **"Analyze this diagram and explain its components"** - Technical analysis
- **"What's the main subject of this photograph?"** - Subject identification
- **"Find any signs or labels in this image"** - Text and symbol detection

### Privacy Features

- **Private chats**: Isolated sessions with no cross-session data sharing
- **Public chats**: Full context including summaries and global memories
- **Document and image analysis**: Respects session privacy settings
- **Memory management**: Only affects public chat sessions
- **Automatic user info extraction**: Only occurs in public chat sessions
- **Intelligent filtering**: Only saves high-confidence or high-importance information

## 🔌 API Endpoints
3. Download models through the settings dialog

### Health & System
---

- `GET /health` - Service health check
- `GET /api/system-info` - System hardware information
- `GET /api/settings` - Application configuration
- `GET /api/diagnostic` - Ollama connection and model status
## 📦 Alternative: Single Executable

### Memory Management
For even easier distribution, you could create a single executable using PyInstaller or similar tools.

- `GET /api/memory` - Get memory entries
- `POST /api/memory` - Save memory entries
- `GET /api/user-info` - Get summary of extracted user information
- `POST /api/user-info/extract` - Manually extract user info from message
- `GET /api/user-info/categories` - Get user info organized by categories
- `DELETE /api/user-info/{key}` - Delete specific user info entry
## 🏆 Benefits of Docker Approach

### Model Management
1. **No dependency conflicts** - Everything runs in isolated containers
2. **Cross-platform** - Works on Windows, macOS, and Linux
3. **Easy updates** - Just pull new images
4. **Consistent environment** - Same setup everywhere
5. **Easy cleanup** - Remove containers when done
6. **Production ready** - Can be deployed to cloud services

- `GET /api/models/available` - Get available models with recommendations
- `GET /api/models` - Get installed models
- `GET /api/running-models` - Get currently running models
- `POST /api/models/download` - Download a model
- `DELETE /api/models/{model_name}` - Remove a model
- `GET /api/models/download-status/{model_name}` - Check download status
- `GET /api/model-info/{model_name}` - Get detailed model information
## ⚙️ Configuration

### Chat & Sessions
The application automatically creates configuration files in the `storage/` directory. You can customize:

- `GET /api/chat-history` - Get chat history
- `WebSocket /api/chat` - Real-time chat endpoint
- `POST /api/chat-sessions` - Create new chat session
- `GET /api/chat-sessions/{session_id}/messages` - Get session messages
- `PUT /api/chat-sessions/{session_id}` - Update session
- `DELETE /api/chat-sessions/{session_id}` - Delete session
- Model settings in `storage/settings.json`
- Database in `storage/elara.db`
- Memory entries in the database

### Document Analysis
## 🆘 Troubleshooting

- `POST /api/analyze-documents` - Analyze documents with prompt
- `GET /api/supported-file-types` - Get supported file types
### Common Issues

### Summarization
1. **Port conflicts**: Change ports in `docker-compose.yml`
2. **Memory issues**: Ensure you have enough RAM for AI models
3. **Model download failures**: Check internet connection and Ollama logs

- `POST /api/summarize` - Generate conversation summary
- `POST /api/chat-sessions/{session_id}/summarize` - Generate session summary
- `GET /api/chat-sessions/{session_id}/summaries` - Get session summaries
- `GET /api/chat-sessions/{session_id}/summary` - Get latest session summary
- `GET /api/chat-sessions/{session_id}/insights` - Get session insights
- `GET /api/summaries/high-confidence` - Get high-confidence summaries

### Image Analysis

- `POST /api/analyze-images` - Analyze images with prompt
- **WebSocket Support**: Images can be analyzed through the main chat WebSocket endpoint
- **Mixed Analysis**: Documents and images can be analyzed together via WebSocket

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
- **Vision models** for image analysis capabilities
- **Context building** with summaries and memories
- **Document processing** with multiple format support
- **Image processing** with intelligent scaling and splitting
- **User info extraction** with intelligent categorization and filtering

### Data Storage

- **SQLite database** for chat sessions, messages, and summaries
- **JSON files** for configuration and memory
- **Temporary file processing** for document and image analysis
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
### Logs

```bash
# Backend tests
cd backend
python test_summarization.py
python test_privacy_chat.py
python test_document_analysis.py
python test_user_info_extraction.py
python test_image_analysis.py  # Test image analysis functionality
# View all logs
docker-compose logs -f

# Frontend tests
cd frontend
npm test
# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f ollama
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
## 📚 Documentation

- **Semantic search** using embeddings for summary retrieval
- **Multi-language support** for international users
- **User preferences** for summary customization
- **Advanced file processing** with OCR capabilities
- **Enhanced image analysis** with object detection and segmentation
- **Video analysis** support for multimedia content
- **Plugin system** for extensible functionality
- **Mobile app** for iOS and Android
- **Collaborative features** for team usage
- [Features Overview](FEATURES.md)
- [API Documentation](API.md)
- [Model Configuration](MODEL_CONFIGURATION_FEATURE.md)
- [Development Guide](DEVELOPMENT.md)



## 🛑 Stopping and Cleaning Up

- To stop all services:
  ```bash
  docker-compose down
  ```
- To view logs:
  ```bash
  docker-compose logs -f
  ```

---

## ⚙️ Configuration

The application automatically creates configuration files in the `storage/` directory. You can customize:

- Model settings in `storage/settings.json`
- Database in `storage/elara.db`
- Memory entries in the database

## 🆘 Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in `docker-compose.yml`
2. **Memory issues**: Ensure you have enough RAM for AI models
3. **Model download failures**: Check internet connection and Ollama logs

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f ollama
```

## 📚 Documentation

- [Features Overview](FEATURES.md)
- [API Documentation](API.md)
- [Model Configuration](MODEL_CONFIGURATION_FEATURE.md)
- [Development Guide](DEVELOPMENT.md)
