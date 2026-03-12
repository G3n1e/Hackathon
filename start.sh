#!/usr/bin/env bash
# SK-Connect Job Card Service - Startup Script
# Usage: ./start.sh

set -e

cd "$(dirname "$0")/server"

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is not installed. Download from https://nodejs.org"
  exit 1
fi

# Check Ollama
if ! command -v ollama &> /dev/null; then
  echo "WARNING: Ollama not found in PATH. Make sure Ollama is running at http://127.0.0.1:11434"
  echo "Download from https://ollama.com — then run: ollama pull llama3:8b"
  echo ""
fi

# Install dependencies if needed
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

echo ""
echo "================================================"
echo "  SK-Connect Job Card Service"
echo "  Server: http://127.0.0.1:8787"
echo "  Ollama: http://127.0.0.1:11434"
echo "================================================"
echo ""
echo "Keep this terminal open while using the extension."
echo "Press Ctrl+C to stop."
echo ""

npm start
