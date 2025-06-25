# Elara - AI Chat Application

A modern AI chat application with local model support via Ollama, featuring a comprehensive settings dialog for memory management and model selection.

## Features

### Chat Interface

- Real-time chat with AI models
- WebSocket-based streaming responses
- Message history persistence
- Model selection for different conversations

### Settings Dialog

Access the settings dialog by clicking the gear icon (⚙️) in the side panel.

#### AI Memory Management

- Store key-value pairs that the AI should remember across conversations
- Add, edit, and remove memory entries
- Automatic saving to `backend/storage/memory.json`
- Examples:
  - Key: "My name" → Value: "John Doe"
  - Key: "My profession" → Value: "Software Engineer"
  - Key: "My preferences" → Value: "I prefer concise responses"

#### Model Management

- Browse available Ollama models with detailed descriptions
- Hardware-aware recommendations based on your system specs
- One-click model downloads with progress tracking
- **Installed models management** with remove functionality
- Model information including:
  - Strengths and weaknesses
  - Best use cases
  - Hardware requirements
  - Installation status

### Available Models

#### Text Models

- **llama3.2:1b** - Ultra-fast for real-time chat
- **llama3.2:3b** - Balanced performance and quality
- **llama3.2:8b** - Strong reasoning and document understanding
- **llama3.2:70b** - Exceptional capabilities for complex tasks

#### Specialized Models

- **llava:7b** - Multimodal model for image analysis
- **codellama:7b** - Specialized for code generation and analysis

### Model Management Features

The settings dialog provides two separate sections:

1. **Installed Models** - Shows models currently on your system

   - Remove models to free up disk space
   - View model details and capabilities
   - Confirmation dialog before removal

2. **Available Models** - Shows models available for download
   - Download models with one click
   - Progress tracking during download
   - Hardware recommendations

## System Requirements

The application automatically detects your hardware and recommends appropriate models:

- **Low-end (2-4GB RAM)**: llama3.2:1b
- **Mid-range (4-8GB RAM)**: llama3.2:1b, llama3.2:3b
- **High-end (8-16GB RAM)**: llama3.2:3b, llama3.2:8b, llava:7b, codellama:7b
- **Workstation (16GB+ RAM)**: All models

## Installation

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

## Usage

1. Start both backend and frontend servers
2. Open the application in your browser
3. Click the gear icon in the side panel to access settings
4. Add memory entries and download models as needed
5. Start chatting with your selected AI model

## API Endpoints

### Memory Management

- `GET /api/memory` - Get memory entries
- `POST /api/memory` - Save memory entries

### Model Management

- `GET /api/models/available` - Get available models with recommendations
- `POST /api/models/download` - Download a model
- `DELETE /api/models/{model_name}` - Remove a model
- `GET /api/models/download-status/{model_name}` - Check download status

### Chat

- `GET /api/chat-history` - Get chat history
- `WebSocket /api/chat` - Real-time chat endpoint

## Architecture

- **Frontend**: React 19 with TypeScript, Emotion for styling
- **Backend**: FastAPI with Python
- **Models**: Local Ollama integration
- **Storage**: JSON files for persistence
- **Real-time**: WebSocket communication

## Development

The application follows modern React patterns:

- Functional components with hooks
- TypeScript for type safety
- Emotion for CSS-in-JS styling
- Modern async/await patterns
- Error boundaries for robustness

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
