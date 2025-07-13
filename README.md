# Elara - AI Chat Application

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

---

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

- Node.js 18+ and npm
- Python 3.8+ and pip
- Ollama (for local model support)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Install system dependencies (Ubuntu/Debian)
sudo apt-get install poppler-utils tesseract-ocr

# Start backend
python -m uvicorn app.main:app --reload --port 8000
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
3. Download models through the settings dialog

---

## 📦 Alternative: Single Executable

For even easier distribution, you could create a single executable using PyInstaller or similar tools.

## 🏆 Benefits of Docker Approach

1. **No dependency conflicts** - Everything runs in isolated containers
2. **Cross-platform** - Works on Windows, macOS, and Linux
3. **Easy updates** - Just pull new images
4. **Consistent environment** - Same setup everywhere
5. **Easy cleanup** - Remove containers when done
6. **Production ready** - Can be deployed to cloud services

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
