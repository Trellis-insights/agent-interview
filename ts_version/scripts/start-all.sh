#!/bin/bash

# Start all services script for Temporal Agent TypeScript
# Usage: ./scripts/start-all.sh [method]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
METHOD=${1:-docker}

# Change to project directory
cd "$PROJECT_DIR"

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 1
    else
        return 0
    fi
}

# Function to wait for service
wait_for_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    log_info "Waiting for $service_name to be ready..."
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            log_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    log_error "$service_name failed to start after $max_attempts attempts"
    return 1
}

# Docker method
start_with_docker() {
    log_info "Starting all services with Docker Compose..."
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Stop any existing containers
    log_info "Stopping existing containers..."
    docker-compose -f docker-compose.dev.yml down --remove-orphans
    
    # Build and start services
    log_info "Building and starting services..."
    docker-compose -f docker-compose.dev.yml up -d --build
    
    # Wait for services to be ready
    log_info "Waiting for services to start..."
    sleep 10
    
    # Check service health
    # PostgreSQL health check (skip HTTP check since it's not an HTTP service)
    log_info "PostgreSQL should be running on localhost:5432 (database service)"
    wait_for_service "Temporal" "http://localhost:8233" || true
    wait_for_service "Backend API" "http://localhost:8000/health"
    wait_for_service "Frontend" "http://localhost:3000"
    wait_for_service "Nginx" "http://localhost:80"
    
    log_success "All services started successfully!"
    
    # Display service URLs
    echo ""
    log_info "=== Service URLs ==="
    echo "🌐 Frontend (via Nginx):     http://localhost"
    echo "🌐 Frontend (direct):        http://localhost:3000"
    echo "🚀 Backend API:              http://localhost:8000"
    echo "📊 API Health:               http://localhost:8000/health"
    echo "📖 API Docs:                 http://localhost:8000/api/docs"
    echo "⏰ Temporal Web UI:          http://localhost:8088"
    echo "🗄️  PostgreSQL:              localhost:5432"
    echo "🔴 Redis:                    localhost:6379"
    echo ""
    log_info "=== Logs ==="
    echo "📋 View logs: docker-compose -f docker-compose.dev.yml logs -f [service_name]"
    echo "📋 All logs:  docker-compose -f docker-compose.dev.yml logs -f"
    echo ""
}

# Local method (npm scripts)
start_local() {
    log_info "Starting services locally with npm..."
    
    # Check required ports
    local required_ports=(3000 8000 7233 5432 6379)
    for port in "${required_ports[@]}"; do
        if ! check_port $port; then
            log_warning "Port $port is already in use"
        fi
    done
    
    # Create logs directory
    mkdir -p logs
    
    log_info "Starting PostgreSQL (Docker)..."
    docker run -d --name temporal-postgres \
        -p 5432:5432 \
        -e POSTGRES_PASSWORD=temporal \
        -e POSTGRES_USER=temporal \
        -e POSTGRES_DB=temporal \
        -v "${PROJECT_DIR}/docker/postgres/init-dev.sql:/docker-entrypoint-initdb.d/init.sql" \
        postgres:13-alpine || log_warning "PostgreSQL container may already be running"
    
    log_info "Starting Redis (Docker)..."
    docker run -d --name temporal-redis \
        -p 6379:6379 \
        redis:7-alpine || log_warning "Redis container may already be running"
    
    log_info "Starting Temporal Server (Docker)..."
    docker run -d --name temporal-server \
        -p 7233:7233 \
        -p 8233:8233 \
        -e DB=postgresql \
        -e DB_PORT=5432 \
        -e POSTGRES_USER=temporal \
        -e POSTGRES_PWD=temporal \
        -e POSTGRES_SEEDS=host.docker.internal \
        temporalio/auto-setup:1.22.0 || log_warning "Temporal container may already be running"
    
    # Wait for database and Temporal
    sleep 15
    # PostgreSQL health check (skip HTTP check since it's not an HTTP service)
    log_info "PostgreSQL should be running on localhost:5432 (database service)"
    wait_for_service "Temporal" "http://localhost:8233" || true
    
    log_info "Installing dependencies..."
    npm install
    cd frontend && npm install && cd ..
    
    log_info "Starting backend services..."
    # Start backend in background
    npm run dev > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > logs/backend.pid
    
    # Start worker in background  
    npm run temporal:worker > logs/worker.log 2>&1 &
    WORKER_PID=$!
    echo $WORKER_PID > logs/worker.pid
    
    # Start frontend in background
    cd frontend
    npm start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    cd ..
    
    # Wait for services
    wait_for_service "Backend API" "http://localhost:8000/health"
    wait_for_service "Frontend" "http://localhost:3000"
    
    log_success "All services started successfully!"
    
    # Display service URLs
    echo ""
    log_info "=== Service URLs ==="
    echo "🌐 Frontend:                 http://localhost:3000"
    echo "🚀 Backend API:              http://localhost:8000"
    echo "📊 API Health:               http://localhost:8000/health"
    echo "📖 API Docs:                 http://localhost:8000/api/docs"
    echo "⏰ Temporal Web UI:          http://localhost:8233"
    echo "🗄️  PostgreSQL:              localhost:5432"
    echo "🔴 Redis:                    localhost:6379"
    echo ""
    log_info "=== Process Management ==="
    echo "📋 Stop all: ./scripts/stop-all.sh"
    echo "📋 View logs: tail -f logs/*.log"
    echo "📋 PIDs saved in logs/*.pid files"
    echo ""
}

# Health check function
check_all_services() {
    log_info "Checking service health..."
    
    local services=(
        "Frontend:http://localhost:3000"
        "Backend:http://localhost:8000/health"
        "Temporal:http://localhost:7233"
    )
    
    for service_url in "${services[@]}"; do
        local name=${service_url%%:*}
        local url=${service_url#*:}
        
        if curl -f -s "$url" > /dev/null 2>&1; then
            log_success "$name ✓"
        else
            log_error "$name ✗"
        fi
    done
}

# Display usage
show_usage() {
    echo "Usage: $0 [method]"
    echo ""
    echo "Methods:"
    echo "  docker     Start all services using Docker Compose (default)"
    echo "  local      Start services locally with npm and Docker for databases"
    echo "  health     Check health of all services"
    echo "  stop       Stop all services"
    echo ""
    echo "Examples:"
    echo "  $0 docker    # Start with Docker Compose"
    echo "  $0 local     # Start locally"
    echo "  $0 health    # Check service health"
    echo "  $0 stop      # Stop all services"
}

# Main execution
main() {
    case $METHOD in
        docker)
            start_with_docker
            ;;
        local)
            start_local
            ;;
        health)
            check_all_services
            ;;
        stop)
            ./scripts/stop-all.sh
            ;;
        -h|--help|help)
            show_usage
            ;;
        *)
            log_error "Unknown method: $METHOD"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main