#!/bin/bash

# زِدْني Start Script

echo "🚀 Starting زِدْني..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found! Creating from example..."
    cp .env.example .env
    echo "📝 Please edit .env and add your API keys"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current: $(node -v)"
    exit 1
fi

# Create necessary directories
mkdir -p uploads workspace deployed skills

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start mode
MODE=${1:-dev}

if [ "$MODE" = "docker" ]; then
    echo "🐳 Starting with Docker..."
    docker-compose up -d
    echo "✅ زِدْني is running!"
    echo "📡 API: http://localhost:3001"
    echo "🌐 Frontend: http://localhost"
elif [ "$MODE" = "prod" ]; then
    echo "🏭 Starting in production mode..."
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        echo "📦 Installing PM2..."
        npm install -g pm2
    fi
    
    # Build frontend
    echo "🔨 Building frontend..."
    npm run build
    
    # Start backend with PM2
    echo "🚀 Starting backend..."
    pm2 start server.cjs --name "zidni-backend"
    pm2 save
    
    echo "✅ زِدْني is running in production mode!"
    echo "📡 API: http://localhost:$PORT"
    echo "📁 Frontend: ./dist"
    echo ""
    echo "To view logs: pm2 logs zidni-backend"
    echo "To stop: pm2 stop zidni-backend"
else
    echo "🔧 Starting in development mode..."
    
    # Start backend in background
    node server.cjs &
    SERVER_PID=$!
    
    echo "🚀 Backend started (PID: $SERVER_PID)"
    echo "📡 API: http://localhost:$PORT"
    echo ""
    echo "Press Ctrl+C to stop"
    
    # Wait for interrupt
    trap "kill $SERVER_PID; exit" INT
    wait
fi
