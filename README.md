# Temporal Agent Platform

A multi-language AI agent orchestration platform using Temporal workflows. This repository contains both Python and TypeScript implementations of the same system.

## Assignment Steps

Complete the following tasks in order:

1. **Fix the chat response to only show the response text** ✅
   - Ensure the frontend chat interface displays clean, readable text instead of raw JSON
   - Parse response objects properly to extract the meaningful content

2. **Ensure the model receives all previous messages as input for future messages**
   - Implement conversation history/context management
   - Pass previous chat messages to the LLM for better conversational flow
   - Maintain context across multiple interactions

3. **Ensure that the model uses files in its response**
   - Verify file upload functionality works end-to-end
   - Confirm uploaded files are processed and referenced in agent responses
   - Test file content integration in LLM responses

4. **Ensure that tool calls belong in their own activity**
   - Refactor tool execution to use separate Temporal activities
   - Implement proper tool orchestration within workflows
   - Ensure tool calls are properly isolated and managed

## Project Structure

```
temporal-agent/
├── py_version/          # Python implementation (original)
├── ts_version/          # TypeScript implementation
└── README.md           # This file
```

## Overview

The Temporal Agent Platform allows you to:
- Create and manage AI agents with custom tools
- Execute agent workflows using Temporal
- Upload and process files
- Track execution metrics and results
- Use multiple LLM providers (OpenAI, Anthropic, etc.)

---

# Python Version (`py_version/`)

The original Python implementation using FastAPI, SQLAlchemy, and Temporal Python SDK.

## Prerequisites

- Python 3.9+
- PostgreSQL 12+
- Redis 6+
- Temporal CLI (optional, for local development)

## Setup

1. **Navigate to Python directory:**
   ```bash
   cd py_version
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

5. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

## Running Python Version

### Option 1: With Docker Compose (Recommended)
```bash
docker-compose up -d
```

### Option 2: Manual Setup
1. Start external services (PostgreSQL, Redis, Temporal)
2. Start the API server:
   ```bash
   uvicorn src.main:app --reload --port 8000
   ```
3. Start the Temporal worker:
   ```bash
   python -m src.temporal.worker
   ```

### API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

# TypeScript Version (`ts_version/`)

Modern TypeScript implementation with React frontend, tRPC API, and enhanced developer experience.

## Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL 12+ (optional, can use mocked services)
- Redis 6+ (optional, can use mocked services)
- Temporal CLI (optional, auto-started if available)

## Setup

1. **Navigate to TypeScript directory:**
   ```bash
   cd ts_version
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.development
   # Edit .env.development with your API keys
   ```

   **Required environment variables:**
   ```env
   OPENAI_API_KEY=sk-your-openai-api-key-here
   TRELLIS_API_KEY=your-trellis-api-key-here  # For file uploads
   ```

## Running TypeScript Version

### Option 1: Local Development (Recommended)
Automatically starts all services with smart cleanup:
```bash
npm run start-local-only
```

This command will:
- Clean up any existing processes
- Load environment variables from `.env.development`
- Start local Temporal server (if Temporal CLI available)
- Start backend API server on port 8000
- Start Temporal worker
- Start React frontend on port 3000

### Option 2: With Docker Compose
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Option 3: Manual Setup
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Temporal Worker  
npm run temporal:worker

# Terminal 3 - Frontend
cd frontend && npm start
```

### Option 4: Mock Services (No External Dependencies)
```bash
MOCK_SERVICES=true npm run start-local-only
```

## Service URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Health**: http://localhost:8000/health
- **API Docs**: http://localhost:8000/api/docs
- **Temporal Web UI**: http://localhost:8233 (if running)

## Available Scripts

```bash
npm run dev              # Start backend in development mode
npm run build            # Build the project
npm run test             # Run tests
npm run test:coverage    # Run tests with coverage
npm run lint             # Lint the code
npm run start-local-only # Start all services locally
npm run temporal:worker  # Start Temporal worker
```

## Stopping Services

```bash
# Stop all services
./scripts/stop-all.sh

# Stop only local processes (not Docker)
./scripts/stop-all.sh local

# Force stop everything
./scripts/stop-all.sh force

# Check service status
./scripts/stop-all.sh status
```

---

# Environment Configuration

Both versions require API keys and configuration. Copy the example environment files and update them:

## Required API Keys

1. **OpenAI API Key**: Get from https://platform.openai.com/api-keys
2. **Trellis API Key**: For file upload functionality (optional)

## Environment Files

- **Python**: `py_version/.env`
- **TypeScript**: `ts_version/.env.development`

## Mock Services

Both versions support mocked services for development without external dependencies:

- **Python**: Set `MOCK_SERVICES=true` in `.env`
- **TypeScript**: Run with `MOCK_SERVICES=true npm run start-local-only`

---

# Features

## Core Functionality
- ✅ AI Agent creation and management
- ✅ Custom tool integration
- ✅ File upload and processing
- ✅ Temporal workflow orchestration
- ✅ Multi-LLM provider support
- ✅ Real-time chat interface (TypeScript only)

## TypeScript Version Enhancements
- 🎨 Modern React frontend with chat interface
- ⚡ tRPC for type-safe APIs
- 🔧 Enhanced developer tools and scripts
- 🐳 Docker-free local development option
- 📊 Comprehensive test coverage
- 🚀 Automated service management

## Python Version Features
- 🐍 FastAPI with automatic OpenAPI docs
- 🗄️ SQLAlchemy ORM with Alembic migrations
- 🔍 Comprehensive logging and monitoring
- 🐳 Full Docker Compose setup

---

# Development

## Project Architecture

Both versions follow similar patterns:
- **API Layer**: FastAPI (Python) / tRPC (TypeScript)
- **Workflow Engine**: Temporal
- **Database**: PostgreSQL (optional)
- **Cache**: Redis (optional)
- **Frontend**: Streamlit (Python) / React (TypeScript)

## Testing

### Python
```bash
cd py_version
pytest tests/ -v --cov=src
```

### TypeScript
```bash
cd ts_version
npm test              # Run tests
npm run test:coverage # With coverage report
```

## Contributing

1. Choose your preferred implementation (Python or TypeScript)
2. Follow the setup instructions above
3. Make your changes
4. Run tests to ensure everything works
5. Submit a pull request

---

# Troubleshooting

## Common Issues

### Port Conflicts
If you get port conflicts, check what's running:
```bash
lsof -i :3000  # Frontend
lsof -i :8000  # Backend
lsof -i :7233  # Temporal
```

### Environment Variables
Make sure your `.env` files have real API keys, not placeholder values.

### Docker Issues (TypeScript)
The TypeScript version is designed to work without Docker. Use the local development option:
```bash
npm run start-local-only
```

### Temporal Connection
If Temporal connection fails, either:
1. Install Temporal CLI: `brew install temporal`
2. Run with mocked services: `MOCK_SERVICES=true`

## Getting Help

- Check the logs in the `logs/` directory
- Use the status command: `./scripts/stop-all.sh status` (TypeScript)
- Review the API documentation at `/docs` endpoint

---

# License

This project is licensed under the MIT License - see the LICENSE file for details.