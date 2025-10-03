#!/bin/bash

# Stop all services script for Temporal Agent TypeScript
# Usage: ./scripts/stop-all.sh [method]

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
METHOD=${1:-all}

# Change to project directory
cd "$PROJECT_DIR"

# Stop Docker services
stop_docker() {
    # Check if Docker is available and running
    if ! command -v docker &> /dev/null; then
        log_info "Docker not available, skipping Docker services"
        return 0
    fi
    
    if ! docker info &> /dev/null; then
        log_info "Docker daemon not running, skipping Docker services"
        return 0
    fi
    
    log_info "Stopping Docker Compose services..."
    
    if [[ -f "docker-compose.dev.yml" ]]; then
        docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || log_warning "Failed to stop Docker Compose services"
        log_success "Docker Compose services stopped"
    else
        log_info "docker-compose.dev.yml not found, skipping"
    fi
    
    # Stop individual Docker containers if they exist
    local containers=(
        "temporal-postgres"
        "temporal-redis" 
        "temporal-server"
    )
    
    for container in "${containers[@]}"; do
        if docker ps -q -f name="$container" 2>/dev/null | grep -q .; then
            log_info "Stopping container: $container"
            docker stop "$container" 2>/dev/null && docker rm "$container" 2>/dev/null || true
        fi
    done
}

# Force kill processes by name pattern
force_kill_by_pattern() {
    local pattern=$1
    local description=$2
    
    local pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
        log_info "Force stopping $description processes..."
        for pid in $pids; do
            if kill -0 "$pid" 2>/dev/null; then
                log_info "Force killing $description (PID: $pid)"
                kill -9 "$pid" 2>/dev/null || true
            fi
        done
    fi
}

# Stop local processes
stop_local() {
    log_info "Stopping local processes..."
    
    # Stop processes using PID files
    local pid_files=(
        "logs/backend.pid"
        "logs/worker.pid"
        "logs/frontend.pid"
        "logs/temporal.pid"
    )
    
    for pid_file in "${pid_files[@]}"; do
        if [[ -f "$pid_file" ]]; then
            local pid=$(cat "$pid_file")
            local process_name=$(basename "$pid_file" .pid)
            
            if kill -0 "$pid" 2>/dev/null; then
                log_info "Stopping $process_name (PID: $pid)"
                kill "$pid"
                
                # Wait for process to stop gracefully
                local attempts=10
                while kill -0 "$pid" 2>/dev/null && [[ $attempts -gt 0 ]]; do
                    sleep 1
                    ((attempts--))
                done
                
                # Force kill if still running
                if kill -0 "$pid" 2>/dev/null; then
                    log_warning "Force killing $process_name"
                    kill -9 "$pid"
                fi
                
                log_success "$process_name stopped"
            else
                log_info "$process_name was not running"
            fi
            
            rm -f "$pid_file"
        fi
    done
    
    # Stop any remaining processes on known ports
    local ports=(3000 8000 7233 8233)
    for port in "${ports[@]}"; do
        local pids=$(lsof -ti :$port 2>/dev/null || true)
        if [[ -n "$pids" ]]; then
            # Handle multiple PIDs on the same port
            for pid in $pids; do
                if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
                    # Check if this is one of our processes by looking at the command
                    local cmd=$(ps -p "$pid" -o command= 2>/dev/null || echo "")
                    
                    # Only kill processes that look like our services
                    if [[ "$cmd" =~ (react-scripts|npm|node|tsx|temporal|frontend|backend|worker) ]] || [[ "$port" == "8000" ]] || [[ "$port" == "7233" ]] || [[ "$port" == "8233" ]]; then
                        log_info "Stopping process on port $port (PID: $pid) - $cmd"
                        kill "$pid" 2>/dev/null || true
                        
                        # Wait a moment for graceful shutdown
                        sleep 1
                        
                        # Force kill if still running
                        if kill -0 "$pid" 2>/dev/null; then
                            log_warning "Force killing process on port $port (PID: $pid)"
                            kill -9 "$pid" 2>/dev/null || true
                        fi
                    else
                        log_info "Skipping non-service process on port $port (PID: $pid) - $cmd"
                    fi
                fi
            done
        fi
    done
    
    # Force kill any remaining stubborn processes
    force_kill_by_pattern "react-scripts start" "React development server"
    force_kill_by_pattern "npm.*start" "npm start processes"
    force_kill_by_pattern "tsx.*src/server/index.ts" "backend server"
    force_kill_by_pattern "tsx.*src/temporal/worker.ts" "temporal worker"
    force_kill_by_pattern "temporal server start-dev" "temporal server"
}

# Clean up function
cleanup() {
    log_info "Cleaning up..."
    
    # Remove PID files
    rm -f logs/*.pid
    
    # Clean up Docker resources if Docker is available and running
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        log_info "Cleaning up Docker resources..."
        docker system prune -f --volumes 2>/dev/null || true
    fi
    
    log_success "Cleanup completed"
}

# Stop specific service
stop_service() {
    local service=$1
    
    case $service in
        frontend)
            if [[ -f "logs/frontend.pid" ]]; then
                local pid=$(cat "logs/frontend.pid")
                kill "$pid" 2>/dev/null || true
                rm -f "logs/frontend.pid"
                log_success "Frontend stopped"
            else
                # Try to stop on port 3000
                local pid=$(lsof -ti :3000 2>/dev/null || true)
                [[ -n "$pid" ]] && kill "$pid"
                log_info "Frontend process stopped"
            fi
            ;;
        backend)
            if [[ -f "logs/backend.pid" ]]; then
                local pid=$(cat "logs/backend.pid")
                kill "$pid" 2>/dev/null || true
                rm -f "logs/backend.pid"
                log_success "Backend stopped"
            else
                # Try to stop on port 8000
                local pid=$(lsof -ti :8000 2>/dev/null || true)
                [[ -n "$pid" ]] && kill "$pid"
                log_info "Backend process stopped"
            fi
            ;;
        worker)
            if [[ -f "logs/worker.pid" ]]; then
                local pid=$(cat "logs/worker.pid")
                kill "$pid" 2>/dev/null || true
                rm -f "logs/worker.pid"
                log_success "Worker stopped"
            else
                log_info "Worker was not running"
            fi
            ;;
        temporal)
            if command -v docker &> /dev/null && docker info &> /dev/null; then
                docker stop temporal-server 2>/dev/null || true
                docker rm temporal-server 2>/dev/null || true
                log_success "Temporal server stopped"
            else
                log_info "Docker not available, skipping Temporal container stop"
            fi
            ;;
        postgres)
            if command -v docker &> /dev/null && docker info &> /dev/null; then
                docker stop temporal-postgres 2>/dev/null || true
                docker rm temporal-postgres 2>/dev/null || true
                log_success "PostgreSQL stopped"
            else
                log_info "Docker not available, skipping PostgreSQL container stop"
            fi
            ;;
        redis)
            if command -v docker &> /dev/null && docker info &> /dev/null; then
                docker stop temporal-redis 2>/dev/null || true
                docker rm temporal-redis 2>/dev/null || true
                log_success "Redis stopped"
            else
                log_info "Docker not available, skipping Redis container stop"
            fi
            ;;
        *)
            log_error "Unknown service: $service"
            exit 1
            ;;
    esac
}

# Show running services
show_status() {
    log_info "Service Status:"
    
    # Check Docker containers
    echo ""
    echo "Docker Containers:"
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter "name=temporal" 2>/dev/null || echo "No Temporal Docker containers running"
    else
        echo "Docker not available or daemon not running"
    fi
    
    # Check local processes
    echo ""
    echo "Local Processes:"
    local ports=(3000 8000 7233 5432 6379)
    for port in "${ports[@]}"; do
        local pid=$(lsof -ti :$port 2>/dev/null || echo "")
        local service=""
        case $port in
            3000) service="Frontend" ;;
            8000) service="Backend API" ;;
            7233) service="Temporal" ;;
            5432) service="PostgreSQL" ;;
            6379) service="Redis" ;;
        esac
        
        if [[ -n "$pid" ]]; then
            echo "✅ $service (Port $port) - PID: $pid"
        else
            echo "❌ $service (Port $port) - Not running"
        fi
    done
    
    echo ""
    echo "PID Files:"
    for pid_file in logs/*.pid; do
        if [[ -f "$pid_file" ]]; then
            local pid=$(cat "$pid_file")
            local service=$(basename "$pid_file" .pid)
            if kill -0 "$pid" 2>/dev/null; then
                echo "✅ $service - PID: $pid (Running)"
            else
                echo "❌ $service - PID: $pid (Stale)"
            fi
        fi
    done
    
    [[ ! -f logs/*.pid ]] && echo "No PID files found"
}

# Display usage
show_usage() {
    echo "Usage: $0 [method|service]"
    echo ""
    echo "Methods:"
    echo "  all        Stop all services (default)"
    echo "  docker     Stop Docker Compose services only"
    echo "  local      Stop local npm processes only"
    echo "  force      Force kill all processes (aggressive)"
    echo "  cleanup    Clean up resources and PID files"
    echo "  status     Show status of all services"
    echo ""
    echo "Individual Services:"
    echo "  frontend   Stop frontend React app"
    echo "  backend    Stop backend API server"
    echo "  worker     Stop Temporal worker"
    echo "  temporal   Stop Temporal server"
    echo "  postgres   Stop PostgreSQL"
    echo "  redis      Stop Redis"
    echo ""
    echo "Examples:"
    echo "  $0              # Stop all services"
    echo "  $0 docker       # Stop Docker services only"
    echo "  $0 frontend     # Stop frontend only"
    echo "  $0 status       # Show service status"
}

# Main execution
main() {
    case $METHOD in
        all)
            stop_docker
            stop_local
            cleanup
            log_success "All services stopped!"
            ;;
        docker)
            stop_docker
            ;;
        local)
            stop_local
            ;;
        force)
            log_info "Force stopping all processes..."
            stop_docker
            stop_local
            force_kill_by_pattern "react-scripts" "all React processes"
            force_kill_by_pattern "npm.*start" "all npm start processes"
            force_kill_by_pattern "tsx" "all tsx processes"
            force_kill_by_pattern "temporal" "all temporal processes"
            force_kill_by_pattern "node.*3000" "all Node processes on port 3000"
            force_kill_by_pattern "node.*8000" "all Node processes on port 8000"
            cleanup
            log_success "Force stop completed!"
            ;;
        cleanup)
            cleanup
            ;;
        status)
            show_status
            ;;
        frontend|backend|worker|temporal|postgres|redis)
            stop_service "$METHOD"
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

# Handle Ctrl+C gracefully
trap 'log_info "Received interrupt signal, stopping..."; main' INT

# Run main function
main