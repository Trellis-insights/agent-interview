#!/bin/bash

# Start all services script for Temporal Agent TypeScript - NO DOCKER VERSION
# Usage: ./scripts/start-local-only.sh

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
    local max_attempts=15
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

# Check if required local services are available
check_requirements() {
    log_info "Checking requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is required but not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is required but not installed"
        exit 1
    fi
    
    # Check for Temporal CLI if not mocking
    if [[ "${MOCK_SERVICES:-false}" != "true" ]] && [[ "${AUTO_TEMPORAL:-true}" == "true" ]]; then
        if command -v temporal &> /dev/null; then
            log_success "Temporal CLI found - will start local Temporal server"
        else
            log_warning "Temporal CLI not found. Install with: brew install temporal"
            log_warning "Or set AUTO_TEMPORAL=false to skip automatic Temporal startup"
        fi
    fi
    
    log_info "This script runs WITHOUT Docker dependencies"
    if [[ "${MOCK_SERVICES:-false}" != "true" ]]; then
        if [[ "${AUTO_TEMPORAL:-true}" == "true" ]]; then
            log_info "Will automatically start:"
            log_info "- Local Temporal server (if Temporal CLI available)"
            log_warning "You'll still need externally:"
            log_warning "- PostgreSQL on localhost:5432 (for persistence)"
            log_warning "- Redis on localhost:6379 (for caching)"
        else
            log_warning "For full functionality, you'll need externally:"
            log_warning "- PostgreSQL running on localhost:5432"
            log_warning "- Redis running on localhost:6379" 
            log_warning "- Temporal server running on localhost:7233"
        fi
    else
        log_info "Using mocked services - no external dependencies needed"
    fi
    echo ""
    
    log_success "Requirements check passed"
}

# Start local Temporal server
start_temporal_server() {
    if [[ "${MOCK_SERVICES:-false}" == "true" ]]; then
        log_info "Skipping Temporal server (MOCK_SERVICES=true)"
        return 0
    fi
    
    if [[ "${AUTO_TEMPORAL:-true}" != "true" ]]; then
        log_info "Skipping Temporal server (AUTO_TEMPORAL=false)"
        return 0
    fi
    
    if ! command -v temporal &> /dev/null; then
        log_warning "Temporal CLI not found - skipping Temporal server startup"
        return 0
    fi
    
    # Check if Temporal is already running
    if curl -f -s "http://localhost:7233" > /dev/null 2>&1; then
        log_info "Temporal server already running on port 7233"
        return 0
    fi
    
    log_info "Starting local Temporal server..."
    
    # Start Temporal server in background
    temporal server start-dev > logs/temporal.log 2>&1 &
    TEMPORAL_PID=$!
    echo $TEMPORAL_PID > logs/temporal.pid
    log_info "Temporal server started with PID: $TEMPORAL_PID"
    
    # Wait for Temporal to be ready (check Web UI port since gRPC port doesn't respond to HTTP)
    wait_for_service "Temporal Server" "http://localhost:8233" || {
        log_error "Failed to start Temporal server"
        return 1
    }
    
    log_success "Temporal server is ready!"
    return 0
}

# Start local services only
start_local_only() {
    log_info "Starting services locally (NO DOCKER)..."
    
    # Clean up any existing local processes first
    log_info "Cleaning up existing local processes..."
    if [[ -f "$SCRIPT_DIR/stop-all.sh" ]]; then
        "$SCRIPT_DIR/stop-all.sh" local
        # Give processes time to shut down
        sleep 2
    else
        log_warning "stop-all.sh not found, skipping cleanup"
    fi
    
    # Check required ports after cleanup
    local required_ports=(3000 8000)
    if [[ "${AUTO_TEMPORAL:-true}" == "true" ]] && [[ "${MOCK_SERVICES:-false}" != "true" ]]; then
        required_ports+=(7233 8233)  # Add Temporal ports
    fi
    
    local ports_in_use=()
    for port in "${required_ports[@]}"; do
        if ! check_port $port; then
            # Check if this is actually one of our services
            local pids=$(lsof -ti :$port 2>/dev/null || true)
            local our_service=false
            for pid in $pids; do
                if [[ -n "$pid" ]]; then
                    local cmd=$(ps -p "$pid" -o command= 2>/dev/null || echo "")
                    if [[ "$cmd" =~ (react-scripts|npm|node|tsx|temporal|frontend|backend|worker) ]] || [[ "$port" == "8000" ]] || [[ "$port" == "7233" ]] || [[ "$port" == "8233" ]]; then
                        our_service=true
                        break
                    fi
                fi
            done
            if [[ "$our_service" == "true" ]]; then
                ports_in_use+=($port)
            else
                log_info "Port $port in use by non-service process, will try to use anyway"
            fi
        fi
    done
    
    if [[ ${#ports_in_use[@]} -gt 0 ]]; then
        log_warning "Ports still in use after cleanup: ${ports_in_use[*]}"
        log_info "Attempting force cleanup..."
        if [[ -f "$SCRIPT_DIR/stop-all.sh" ]]; then
            "$SCRIPT_DIR/stop-all.sh" force
            sleep 3
        fi
        
        # Final check - only check ports that were actually in use by our services
        local still_in_use=()
        for port in "${ports_in_use[@]}"; do
            if ! check_port $port; then
                # Double-check if this is still one of our services
                local pids=$(lsof -ti :$port 2>/dev/null || true)
                local our_service=false
                for pid in $pids; do
                    if [[ -n "$pid" ]]; then
                        local cmd=$(ps -p "$pid" -o command= 2>/dev/null || echo "")
                        if [[ "$cmd" =~ (react-scripts|npm|node|tsx|temporal|frontend|backend|worker) ]] || [[ "$port" == "8000" ]] || [[ "$port" == "7233" ]] || [[ "$port" == "8233" ]]; then
                            our_service=true
                            break
                        fi
                    fi
                done
                if [[ "$our_service" == "true" ]]; then
                    still_in_use+=($port)
                fi
            fi
        done
        
        if [[ ${#still_in_use[@]} -gt 0 ]]; then
            log_error "Ports still in use by our services after force cleanup: ${still_in_use[*]}"
            log_error "Please manually stop these services or use a different port."
            exit 1
        fi
        log_success "All ports cleared after force cleanup"
    fi
    
    # Create logs directory
    mkdir -p logs
    
    # Set environment for local development
    export NODE_ENV=development
    export MOCK_SERVICES=${MOCK_SERVICES:-false}
    export AUTO_TEMPORAL=${AUTO_TEMPORAL:-true}
    
    # Load environment variables from .env files
    if [[ -f "$PROJECT_DIR/.env.development" ]]; then
        log_info "Loading environment from ts_version/.env.development"
        set -a  # automatically export all variables
        if ! source "$PROJECT_DIR/.env.development"; then
            log_error "Failed to load .env.development - check for syntax errors"
            exit 1
        fi
        set +a
    else
        log_warning "No .env.development file found at $PROJECT_DIR/.env.development"
        log_info "Create this file with your API keys for full functionality"
    fi
    
    # Check if critical environment variables are set
    if [[ "$MOCK_SERVICES" != "true" ]]; then
        local missing_keys=()
        
        if [[ -z "$OPENAI_API_KEY" ]] || [[ "$OPENAI_API_KEY" == "sk-your-openai-api-key-here" ]]; then
            missing_keys+=("OPENAI_API_KEY")
        fi
        
        # Optional but recommended keys
        [[ -z "$TRELLIS_API_KEY" ]] && log_warning "TRELLIS_API_KEY not set (required for file uploads)"
        
        if [[ ${#missing_keys[@]} -gt 0 ]]; then
            log_error "Required environment variables are missing: ${missing_keys[*]}"
            log_error "Please set these API keys in:"
            log_error "  - $PROJECT_DIR/.env.development"
            exit 1
        else
            log_success "Required environment variables found and loaded"
        fi
    fi
    
    log_info "Installing dependencies..."
    npm install
    cd frontend && npm install && cd ..
    
    # Start Temporal server if needed
    start_temporal_server
    
    # Export environment variables so child processes inherit them
    [[ -n "$TRELLIS_API_KEY" ]] && export TRELLIS_API_KEY
    [[ -n "$GEMINI_API_KEY" ]] && export GEMINI_API_KEY
    [[ -n "$ANTHROPIC_API_KEY" ]] && export ANTHROPIC_API_KEY
    [[ -n "$OPENAI_API_KEY" ]] && export OPENAI_API_KEY
    export NODE_ENV MOCK_SERVICES AUTO_TEMPORAL
    
    log_info "Starting backend services..."
    # Start backend in background (inherits exported environment variables)
    npm run dev > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > logs/backend.pid
    log_info "Backend started with PID: $BACKEND_PID"
    
    # Only start temporal worker if not mocking
    if [[ "$MOCK_SERVICES" != "true" ]]; then
        log_info "Starting Temporal worker..."
        npm run temporal:worker > logs/worker.log 2>&1 &
        WORKER_PID=$!
        echo $WORKER_PID > logs/worker.pid
        log_info "Worker started with PID: $WORKER_PID"
    else
        log_info "Skipping Temporal worker (MOCK_SERVICES=true)"
    fi
    
    # Start frontend in background
    log_info "Starting frontend..."
    cd frontend
    # Explicitly set environment variables for React dev server
    # PORT=3000 - Force React to use port 3000
    # CI=true - Disable interactive prompts (fail fast if port in use)
    # REACT_APP_API_URL - Backend API endpoint
    env PORT=3000 CI=true REACT_APP_API_URL="http://localhost:8000" npm start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    cd ..
    log_info "Frontend started with PID: $FRONTEND_PID"
    
    # Wait for services
    wait_for_service "Backend API" "http://localhost:8000/health"
    wait_for_service "Frontend" "http://localhost:3000"
    
    log_success "All local services started successfully!"
    
    # Display service URLs
    echo ""
    log_info "=== Service URLs ===" 
    echo "🌐 Frontend:                 http://localhost:3000"
    echo "🚀 Backend API:              http://localhost:8000"
    echo "📊 API Health:               http://localhost:8000/health"
    echo "📖 API Docs:                http://localhost:8000/api/docs"
    
    if [[ "$MOCK_SERVICES" != "true" ]]; then
        if [[ "$AUTO_TEMPORAL" == "true" ]] && [[ -f "logs/temporal.pid" ]]; then
            echo "⏰ Temporal Server:          http://localhost:7233"
            echo "⏰ Temporal Web UI:          http://localhost:8233"
        else
            echo "⏰ Temporal Web UI:          http://localhost:8233 (if running externally)"
        fi
        echo "🗄️  PostgreSQL:              localhost:5432 (external)"
        echo "🔴 Redis:                    localhost:6379 (external)"
    else
        echo "🔧 Running with mocked services (no external dependencies)"
    fi
    
    echo ""
    log_info "=== Process Management ===" 
    echo "📋 Stop all: ./scripts/stop-all.sh"
    echo "📋 View logs: tail -f logs/*.log"
    echo "📋 PIDs saved in logs/*.pid files"
    echo ""
    
    log_info "=== Environment Variables ==="
    echo "NODE_ENV=$NODE_ENV"
    echo "MOCK_SERVICES=$MOCK_SERVICES"
    echo "AUTO_TEMPORAL=$AUTO_TEMPORAL"
    echo ""
    
    if [[ "$MOCK_SERVICES" != "true" ]]; then
        if [[ "$AUTO_TEMPORAL" != "true" ]] || [[ ! -f "logs/temporal.pid" ]]; then
            log_warning "=== External Services Still Required ==="
            log_warning "Make sure these services are running externally:"
            log_warning "- PostgreSQL on localhost:5432"
            log_warning "- Redis on localhost:6379"
            if [[ "$AUTO_TEMPORAL" != "true" ]]; then
                log_warning "- Temporal server on localhost:7233"
            fi
            log_warning ""
            log_warning "Or restart with: MOCK_SERVICES=true ./scripts/start-local-only.sh"
        else
            log_info "=== External Services Still Required ==="
            log_info "PostgreSQL and Redis are still needed externally:"
            log_info "- PostgreSQL on localhost:5432"
            log_info "- Redis on localhost:6379"
            log_info ""
            log_info "Or restart with: MOCK_SERVICES=true ./scripts/start-local-only.sh"
        fi
    fi
}

# Display usage
show_usage() {
    echo "Usage: $0"
    echo ""
    echo "This script automatically:"
    echo "  - Stops any existing local processes (via stop-all.sh local)"
    echo "  - Loads environment variables from .env files"
    echo "  - Starts all services with proper configuration"
    echo ""
    echo "Environment Variables:"
    echo "  MOCK_SERVICES=true     Run with mocked services (no external dependencies)"
    echo "  AUTO_TEMPORAL=true     Automatically start local Temporal server (default)"
    echo "  AUTO_TEMPORAL=false    Skip automatic Temporal startup"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Start with auto Temporal + external PostgreSQL/Redis"
    echo "  MOCK_SERVICES=true $0                 # Start with mocked services only"
    echo "  AUTO_TEMPORAL=false $0                # Start without auto Temporal"
    echo "  AUTO_TEMPORAL=false MOCK_SERVICES=true $0  # Pure manual mode"
    echo ""
    echo "Prerequisites:"
    echo "  Always required:"
    echo "    - Node.js 18+ and npm"
    echo ""
    echo "  When MOCK_SERVICES=false (default):"
    echo "    - PostgreSQL running on localhost:5432"
    echo "    - Redis running on localhost:6379"
    echo "    - Temporal CLI (brew install temporal) for AUTO_TEMPORAL=true"
    echo "    - OR Temporal server on localhost:7233 if AUTO_TEMPORAL=false"
}

# Handle Ctrl+C gracefully
cleanup() {
    log_info "Received interrupt signal, stopping services..."
    ./scripts/stop-all.sh local
    exit 0
}

trap cleanup INT

# Main execution
main() {
    case ${1:-start} in
        start)
            check_requirements
            start_local_only
            ;;
        -h|--help|help)
            show_usage
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"