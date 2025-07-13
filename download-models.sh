#!/bin/bash

echo "🤖 Downloading recommended AI models..."

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama to be ready..."
until curl -s http://localhost:11434/api/tags > /dev/null; do
    sleep 5
done

# Download recommended models
models=(
    "phi3:mini"
    "llava:7b"
    "tinyllama:1.1b"
)

for model in "${models[@]}"; do
    echo "🤖 Downloading $model..."
    curl -X POST http://localhost:11434/api/pull -d "{\"name\": \"$model\"}"
    echo ""
done

echo "✅ Models downloaded! You can now use Elara." 