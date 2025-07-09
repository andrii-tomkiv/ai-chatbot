#!/bin/bash

# CONAB AI Chatbot Docker Deployment Script

set -e

echo "🚀 Starting CONAB AI Chatbot deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Please create one with your API keys."
    echo "   Required environment variables:"
    echo "   - MISTRAL_API_KEY"
    echo "   - GROQ_API_KEY"
    echo "   - OPENAI_API_KEY (for embeddings)"
fi

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t conab-ai-chatbot .

# Stop and remove existing container if it exists
echo "🛑 Stopping existing container..."
docker stop conab-ai-chatbot || true
docker rm conab-ai-chatbot || true

# Run the new container
echo "🏃 Starting new container..."
docker run -d \
    --name conab-ai-chatbot \
    --restart unless-stopped \
    -p 3000:3000 \
    --env-file .env \
    conab-ai-chatbot

# Wait for the container to start
echo "⏳ Waiting for container to start..."
sleep 10

# Check if the container is running
if docker ps | grep -q conab-ai-chatbot; then
    echo "✅ Container is running successfully!"
    
    # Detect the appropriate URL based on environment
    if [ -n "$VERCEL_URL" ]; then
        APP_URL="https://$VERCEL_URL"
    elif [ -n "$RAILWAY_STATIC_URL" ]; then
        APP_URL="$RAILWAY_STATIC_URL"
    elif [ -n "$HEROKU_APP_NAME" ]; then
        APP_URL="https://$HEROKU_APP_NAME.herokuapp.com"
    else
        # Default to localhost for local development
        PORT=${PORT:-3000}
        APP_URL="http://localhost:$PORT"
    fi
    
    echo "🌐 Application is available at: $APP_URL"
    echo "🔍 Health check: $APP_URL/api/health"
else
    echo "❌ Container failed to start. Check logs with: docker logs conab-ai-chatbot"
    exit 1
fi

echo "🎉 Deployment completed successfully!" 