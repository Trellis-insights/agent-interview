#!/bin/bash

# Deployment script for Temporal Agent TypeScript
# Usage: ./scripts/deploy.sh [environment] [version]

set -e

# Default values
ENVIRONMENT=${1:-development}
VERSION=${2:-latest}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

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

# Validate environment
validate_environment() {
    case $ENVIRONMENT in
        development|staging|production)
            log_info "Deploying to $ENVIRONMENT environment"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            log_info "Valid environments: development, staging, production"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check environment file
    ENV_FILE=".env.$ENVIRONMENT"
    if [[ ! -f "$PROJECT_DIR/$ENV_FILE" ]]; then
        log_error "Environment file $ENV_FILE not found"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Build Docker images
build_images() {
    log_info "Building Docker images..."
    
    cd "$PROJECT_DIR"
    
    # Build for specific environment
    if [[ "$ENVIRONMENT" == "production" ]]; then
        docker build --target production -t temporal-agent-ts:$VERSION .
        docker tag temporal-agent-ts:$VERSION temporal-agent-ts:prod
    else
        docker build --target development -t temporal-agent-ts:$VERSION .
        docker tag temporal-agent-ts:$VERSION temporal-agent-ts:dev
    fi
    
    log_success "Docker images built successfully"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    cd "$PROJECT_DIR"
    
    # Run tests in Docker container
    docker build --target testing -t temporal-agent-ts:test .
    
    if docker run --rm temporal-agent-ts:test; then
        log_success "All tests passed"
    else
        log_error "Tests failed"
        exit 1
    fi
}

# Deploy with Docker Compose
deploy_docker_compose() {
    log_info "Deploying with Docker Compose..."
    
    cd "$PROJECT_DIR"
    
    # Select compose file based on environment
    if [[ "$ENVIRONMENT" == "production" ]]; then
        COMPOSE_FILE="docker-compose.prod.yml"
    else
        COMPOSE_FILE="docker-compose.yml"
    fi
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f "$COMPOSE_FILE" down
    
    # Start services
    log_info "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check health
    if check_health; then
        log_success "Deployment completed successfully"
    else
        log_error "Deployment failed - services are not healthy"
        exit 1
    fi
}

# Check application health
check_health() {
    log_info "Checking application health..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost:8000/health > /dev/null 2>&1; then
            log_success "Application is healthy"
            return 0
        fi
        
        log_info "Health check attempt $attempt/$max_attempts failed, retrying in 5 seconds..."
        sleep 5
        ((attempt++))
    done
    
    log_error "Application health check failed after $max_attempts attempts"
    return 1
}

# Rollback function
rollback() {
    log_warning "Rolling back deployment..."
    
    cd "$PROJECT_DIR"
    
    # Select compose file
    if [[ "$ENVIRONMENT" == "production" ]]; then
        COMPOSE_FILE="docker-compose.prod.yml"
    else
        COMPOSE_FILE="docker-compose.yml"
    fi
    
    # Get previous image
    PREVIOUS_VERSION=$(docker images temporal-agent-ts --format "table {{.Tag}}" | grep -v "TAG\|latest\|$VERSION" | head -n1)
    
    if [[ -n "$PREVIOUS_VERSION" ]]; then
        log_info "Rolling back to version: $PREVIOUS_VERSION"
        
        # Update image tags
        docker tag "temporal-agent-ts:$PREVIOUS_VERSION" "temporal-agent-ts:$VERSION"
        
        # Restart services
        docker-compose -f "$COMPOSE_FILE" up -d
        
        # Check health
        if check_health; then
            log_success "Rollback completed successfully"
        else
            log_error "Rollback failed"
            exit 1
        fi
    else
        log_error "No previous version found for rollback"
        exit 1
    fi
}

# Cleanup old images
cleanup() {
    log_info "Cleaning up old images..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove old versions (keep last 3)
    docker images temporal-agent-ts --format "table {{.Repository}}:{{.Tag}} {{.CreatedAt}}" \
        | grep -v "TAG\|latest" \
        | sort -k2 -r \
        | tail -n +4 \
        | awk '{print $1}' \
        | xargs -r docker rmi
    
    log_success "Cleanup completed"
}

# Main deployment process
main() {
    log_info "Starting deployment process..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Version: $VERSION"
    
    validate_environment
    check_prerequisites
    
    # Skip tests in development for faster deployment
    if [[ "$ENVIRONMENT" != "development" ]]; then
        run_tests
    fi
    
    build_images
    deploy_docker_compose
    
    # Cleanup old images in production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        cleanup
    fi
    
    log_success "Deployment completed successfully!"
    log_info "Application is available at: http://localhost:8000"
    log_info "API documentation: http://localhost:8000/api/docs"
    
    if [[ "$ENVIRONMENT" != "production" ]]; then
        log_info "Temporal Web UI: http://localhost:8088"
        log_info "Grafana: http://localhost:3001 (admin/admin)"
    fi
}

# Handle script arguments
case "${1:-}" in
    --rollback)
        rollback
        ;;
    --health-check)
        check_health
        ;;
    --cleanup)
        cleanup
        ;;
    -h|--help)
        echo "Usage: $0 [environment] [version] [options]"
        echo ""
        echo "Environments: development, staging, production"
        echo "Options:"
        echo "  --rollback      Rollback to previous version"
        echo "  --health-check  Check application health"
        echo "  --cleanup       Clean up old Docker images"
        echo "  -h, --help      Show this help message"
        exit 0
        ;;
    *)
        main
        ;;
esac