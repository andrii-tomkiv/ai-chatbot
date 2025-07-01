# CONAB AI Chatbot - Docker Deployment Guide

This guide explains how to deploy the CONAB AI Chatbot using Docker.

## Prerequisites

- Docker installed and running
- Docker Compose (usually comes with Docker Desktop)
- Environment variables configured (see `.env.example`)

## Quick Start

### 1. Production Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or use the deployment script
./scripts/deploy.sh
```

### 2. Development Mode

```bash
# Run in development mode with hot reloading
docker-compose --profile dev up -d chatbot-dev
```

## Manual Docker Commands

### Build the Image

```bash
# Production build
docker build -t conab-ai-chatbot .

# Development build
docker build -f Dockerfile.dev -t conab-ai-chatbot:dev .
```

### Run the Container

```bash
# Production
docker run -d \
  --name conab-ai-chatbot \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  conab-ai-chatbot

# Development (with volume mounting for hot reload)
docker run -d \
  --name conab-ai-chatbot-dev \
  -p 3001:3000 \
  --env-file .env \
  -v $(pwd):/app \
  -v /app/node_modules \
  -v /app/.next \
  conab-ai-chatbot:dev
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# LLM API Keys
MISTRAL_API_KEY=your_mistral_api_key
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key

# Optional: Rate limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# Optional: Vector store settings
VECTOR_STORE_PATH=./data/vector-store
```

## Health Check

The application includes a health check endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

## Container Management

### View Logs

```bash
# Production container
docker logs conab-ai-chatbot

# Development container
docker logs conab-ai-chatbot-dev

# Follow logs in real-time
docker logs -f conab-ai-chatbot
```

### Stop and Remove

```bash
# Stop containers
docker-compose down

# Remove containers and images
docker-compose down --rmi all

# Manual removal
docker stop conab-ai-chatbot
docker rm conab-ai-chatbot
docker rmi conab-ai-chatbot
```

### Update Application

```bash
# Pull latest code, rebuild and restart
git pull
docker-compose down
docker-compose up -d --build
```

## Troubleshooting

### Container Won't Start

1. Check if port 3000 is available:
   ```bash
   lsof -i :3000
   ```

2. Check container logs:
   ```bash
   docker logs conab-ai-chatbot
   ```

3. Verify environment variables:
   ```bash
   docker exec conab-ai-chatbot env | grep API_KEY
   ```

### Build Issues

1. Clear Docker cache:
   ```bash
   docker system prune -a
   ```

2. Rebuild without cache:
   ```bash
   docker build --no-cache -t conab-ai-chatbot .
   ```

### Performance Issues

1. Monitor container resources:
   ```bash
   docker stats conab-ai-chatbot
   ```

2. Check memory usage:
   ```bash
   docker exec conab-ai-chatbot free -h
   ```

## Production Considerations

### Security

- Use secrets management for API keys in production
- Consider using Docker secrets or Kubernetes secrets
- Run container as non-root user (already configured)

### Monitoring

- Set up logging aggregation
- Monitor container health checks
- Set up alerts for container failures

### Scaling

- Use Docker Swarm or Kubernetes for multi-container deployments
- Consider using a reverse proxy (nginx) for load balancing
- Implement proper session management for multiple instances

## Development Workflow

1. **Local Development**: Use `npm run dev` for fastest iteration
2. **Docker Dev**: Use `docker-compose --profile dev up` for containerized development
3. **Testing**: Build production image locally to test before deployment
4. **Deployment**: Use the deployment script or Docker Compose for production

## File Structure

```
├── Dockerfile              # Production Docker image
├── Dockerfile.dev          # Development Docker image
├── docker-compose.yml      # Multi-service orchestration
├── .dockerignore           # Files to exclude from build
├── scripts/
│   └── deploy.sh          # Deployment automation
└── src/app/api/health/
    └── route.ts           # Health check endpoint
``` 