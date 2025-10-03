# 🚀 Quick Start Guide

Get up and running with Temporal Agent TypeScript in minutes!

## 📋 Prerequisites

- **Docker & Docker Compose** (recommended)
- **Node.js 18+** and **npm 8+**
- **Git**

## ⚡ Option 1: Docker Compose (Recommended)

The fastest way to run everything with zero configuration:

```bash
# Clone and navigate to the project
git clone <repo-url>
cd temporal-agent/ts_version

# Start all services with one command
npm run start-all:docker
```

That's it! 🎉 All services will be running:

- **🌐 Frontend**: http://localhost (via Nginx) or http://localhost:3000 (direct)
- **🚀 Backend API**: http://localhost:8000
- **⏰ Temporal Web UI**: http://localhost:8088
- **📊 Health Check**: http://localhost:8000/health

## ⚡ Option 2: Local Development

For development with hot reload and local debugging:

```bash
# Clone and navigate to the project
git clone <repo-url>
cd temporal-agent/ts_version

# Setup and start all services locally
./scripts/setup.sh development
npm run start-all:local
```

## ⚡ Option 3: Pure Local (No Docker)

For completely local development without any Docker dependencies:

```bash
# Clone and navigate to the project
git clone <repo-url>
cd temporal-agent/ts_version

# Option 3a: With external services (requires PostgreSQL, Redis, Temporal)
npm run start-local-only

# Option 3b: With mocked services (no external dependencies)
npm run start-local-mock
```

This starts:
- Backend and worker with hot reload
- Frontend React dev server
- Temporal, PostgreSQL, and Redis in Docker

## 🎯 Using the Application

### 1. Open the Frontend
Navigate to http://localhost (Docker) or http://localhost:3000 (local)

### 2. Chat with the Agent
- **Type your message**: "Calculate my pension benefits for 25 years of service with $75,000 salary"
- **Upload files**: Drag and drop documents (PDF, DOC, TXT, etc.)
- **Select model**: Choose between GPT-4, GPT-4O, or GPT-4 Turbo

### 3. Monitor System Status
Click the "Status" tab to monitor API health and performance metrics

## 🛠️ Available Commands

### Quick Start Commands
```bash
# Start all services (Docker)
npm run start-all:docker

# Start all services (Local with Docker dependencies)
npm run start-all:local

# Start services locally (No Docker) - requires external PostgreSQL/Redis
# Automatically stops existing processes first
npm run start-local-only

# Start services locally with auto Temporal server (requires Temporal CLI)
npm run start-local-temporal

# Start services with mocked dependencies (No external services needed)
npm run start-local-mock

# Stop all services
npm run stop-all

# Check service status
npm run services:status

# Check service health
npm run services:health
```

### Individual Services
```bash
# Backend only
npm run dev

# Frontend only (in frontend/ directory)
cd frontend && npm start

# Temporal worker only
npm run temporal:worker

# Tests
npm test
npm run test:coverage

# Build for production
npm run build
```

## 📂 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | React chat interface |
| **Backend API** | http://localhost:8000 | REST API server |
| **Nginx Proxy** | http://localhost | Combined frontend/backend |
| **API Health** | http://localhost:8000/health | Health check endpoint |
| **API Docs** | http://localhost:8000/api/docs | Interactive API docs |
| **Temporal Web UI** | http://localhost:8088 | Workflow monitoring |
| **PostgreSQL** | localhost:5432 | Database |
| **Redis** | localhost:6379 | Cache/sessions |

## 🔧 Environment Configuration

### Quick Setup
```bash
# Copy environment files
cp .env.example .env.development
cp frontend/.env.development frontend/.env.local

# Add your API keys to .env.development:
OPENAI_API_KEY=sk-your-openai-api-key-here
TRELLIS_API_KEY=your-trellis-api-key-here
```

### Environment Variable Loading
The scripts will automatically load environment variables from:
1. `./ts_version/.env.development` (local to TypeScript project)
2. `./.env.local` (parent directory, if exists)

**Important**: If you have API keys in the parent directory's `.env.local` file, the start-local-only script will automatically find and load them.

### Development vs Production
- **Development**: Hot reload, debug logging, mock services available
- **Production**: Optimized builds, security hardened, monitoring enabled

## 🧪 Testing the Setup

### 1. Health Check
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy"}
```

### 2. API Test
```bash
curl -X POST http://localhost:8000/api/trpc/callAgent \
  -H "Content-Type: application/json" \
  -d '{
    "request_text": "Hello, test message",
    "agents": [{
      "name": "benefits",
      "system_prompt": "You are a helpful assistant",
      "tools": [],
      "llm_provider": "OPENAI",
      "model": "gpt-4o"
    }]
  }'
```

### 3. Frontend Test
- Open http://localhost:3000
- Type a message and send
- Check that you get a response from the agent

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Check what's using the port
lsof -i :3000  # or :8000, :5432, etc.

# Stop conflicting services
npm run stop-all
```

**Docker Issues**
```bash
# Restart Docker
docker system prune -f
docker-compose -f docker-compose.dev.yml down --volumes
npm run start-all:docker
```

**API Connection Failed**
```bash
# Check backend is running
curl http://localhost:8000/health

# Check logs
docker-compose -f docker-compose.dev.yml logs -f backend
# or for local: tail -f logs/backend.log
```

**File Upload Not Working**
- Ensure TRELLIS_API_KEY is set in your environment
- Check file size (max 10MB)
- Verify supported file types (PDF, TXT, DOC, DOCX, CSV, JSON)

### Getting Help

1. **Check Service Status**: `npm run services:status`
2. **View Logs**: 
   - Docker: `docker-compose -f docker-compose.dev.yml logs -f`
   - Local: `tail -f logs/*.log`
3. **Check Health**: `npm run services:health`
4. **Restart Everything**: `npm run stop-all && npm run start-all:docker`

## 🎯 Next Steps

### Customization
- **Add New Agents**: Edit `src/agents/` directory
- **Add New Tools**: Create tools in `src/tools/implementations/`
- **Modify Frontend**: Edit React components in `frontend/src/components/`

### Production Deployment
```bash
# Build for production
npm run build
cd frontend && npm run build:prod

# Deploy with production compose
docker-compose -f docker-compose.prod.yml up -d
```

### Development Workflow
```bash
# Make code changes (hot reload enabled)
# Run tests
npm test

# Lint and type check
npm run lint
npm run type-check

# Stop services when done
npm run stop-all
```

## 📖 Documentation

- **[Complete README](README.md)** - Full project documentation
- **[API Documentation](docs/API.md)** - Detailed API reference
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment
- **[Frontend README](frontend/README.md)** - Frontend-specific docs

---

**🎉 You're all set! Start chatting with your AI agents!**

**Need help?** Check the troubleshooting section above or refer to the detailed documentation.