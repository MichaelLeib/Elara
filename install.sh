#!/bin/bash

set -e

echo "🚀 Installing Elara AI Chat Application..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose found"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Elara Configuration
OLLAMA_HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_PORT=5173
EOF
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Elara is now running!"
    echo ""
    echo "🌐 Access the application at: http://localhost:5173"
    echo "🔧 Backend API at: http://localhost:8000"
    echo "🤖 Ollama at: http://localhost:11434"
    echo ""
    echo "📖 Next steps:"
    echo "1. Open http://localhost:5173 in your browser"
    echo "2. Go to Settings (gear icon) to download AI models"
    echo "3. Start chatting!"
    echo ""
    echo "🛑 To stop: docker-compose down"
    echo "📊 To view logs: docker-compose logs -f"
else
    echo "❌ Failed to start services. Check logs with: docker-compose logs"
    exit 1
fi 