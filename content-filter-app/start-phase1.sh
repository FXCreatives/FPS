#!/bin/bash

# Content Filter API - Phase 1 Startup Script
# This script installs dependencies and starts the server

echo "🚀 Content Filter API - Phase 1 Startup"
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 14+ first:"
    echo "   Ubuntu/Debian: sudo apt install nodejs npm"
    echo "   CentOS/RHEL: sudo yum install nodejs npm"
    echo "   macOS: brew install node"
    echo "   Windows: Download from https://nodejs.org"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 14 or higher."
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm $(npm -v) found"

# Install dependencies
echo "\n📦 Installing dependencies..."
if [ -f "phase1-package.json" ]; then
    npm install --package-lock-only
    if [ $? -eq 0 ]; then
        echo "✅ Dependencies installed successfully"
    else
        echo "❌ Failed to install dependencies"
        exit 1
    fi
else
    echo "❌ phase1-package.json not found"
    exit 1
fi

# Create data directory
echo "\n📁 Creating data directory..."
mkdir -p data
echo "✅ Data directory ready"

# Start the server
echo "\n🎯 Starting Content Filter API..."
echo "   Server: http://localhost:3000"
echo "   Health: http://localhost:3000/api/health"
echo "   Docs:   http://localhost:3000/api/docs"
echo "   Test:   http://localhost:3000/api/test"
echo ""
echo "📋 API Key: Use 'X-API-Key: cf_demo_key' (any key starting with 'cf_')"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start server with error handling
node phase1-server.js

# If server stops, show helpful information
echo ""
echo "📊 Server stopped"
echo ""
echo "🔧 Troubleshooting:"
echo "   1. Check if port 3000 is already in use"
echo "   2. View logs above for error details"
echo "   3. Run 'npm test' to test the API"
echo ""
echo "🚀 To restart: ./start-phase1.sh"