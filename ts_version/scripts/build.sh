#!/bin/bash

# Build script for Temporal Agent TypeScript
# Usage: ./scripts/build.sh [target] [tag]

set -e

# Default values
TARGET=${1:-production}
TAG=${2:-latest}
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

# Validate build target
validate_target() {
    case $TARGET in
        development|production|testing)
            log_info "Building target: $TARGET"
            ;;
        *)
            log_error "Invalid build target: $TARGET"
            log_info "Valid targets: development, production, testing"
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
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check if Dockerfile exists
    if [[ ! -f "$PROJECT_DIR/Dockerfile" ]]; then
        log_error "Dockerfile not found"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Build Docker image
build_image() {
    log_info "Building Docker image..."
    
    cd "$PROJECT_DIR"
    
    # Get build context info
    local build_date=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
    local git_commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    local git_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    
    # Build arguments
    local build_args=(
        --build-arg "BUILD_DATE=$build_date"
        --build-arg "GIT_COMMIT=$git_commit"
        --build-arg "GIT_BRANCH=$git_branch"
        --build-arg "VERSION=$TAG"
    )
    
    # Build command
    log_info "Docker build command: docker build --target $TARGET -t temporal-agent-ts:$TAG ${build_args[*]} ."
    
    if docker build \
        --target "$TARGET" \
        -t "temporal-agent-ts:$TAG" \
        "${build_args[@]}" \
        .; then
        
        log_success "Docker image built successfully"
        
        # Tag as environment-specific
        case $TARGET in
            development)
                docker tag "temporal-agent-ts:$TAG" "temporal-agent-ts:dev"
                ;;
            production)
                docker tag "temporal-agent-ts:$TAG" "temporal-agent-ts:prod"
                ;;
            testing)
                docker tag "temporal-agent-ts:$TAG" "temporal-agent-ts:test"
                ;;
        esac
        
        log_success "Image tagged successfully"
    else
        log_error "Docker build failed"
        exit 1
    fi
}

# Run security scan
security_scan() {
    log_info "Running security scan..."
    
    # Check if docker scout is available
    if docker scout --help &> /dev/null; then
        docker scout quickview "temporal-agent-ts:$TAG"
        docker scout cves "temporal-agent-ts:$TAG"
    else
        log_warning "Docker Scout not available, skipping security scan"
    fi
}

# Test the built image
test_image() {
    log_info "Testing built image..."
    
    case $TARGET in
        development|production)
            # Start container in background
            local container_id=$(docker run -d -p 8080:8000 "temporal-agent-ts:$TAG")
            
            # Wait for container to start
            log_info "Waiting for container to start..."
            sleep 10
            
            # Test health endpoint
            local max_attempts=10
            local attempt=1
            
            while [[ $attempt -le $max_attempts ]]; do
                if curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
                    log_success "Health check passed"
                    docker stop "$container_id" > /dev/null
                    docker rm "$container_id" > /dev/null
                    return 0
                fi
                
                log_info "Health check attempt $attempt/$max_attempts failed, retrying..."
                sleep 5
                ((attempt++))
            done
            
            log_error "Health check failed"
            docker stop "$container_id" > /dev/null
            docker rm "$container_id" > /dev/null
            exit 1
            ;;
        testing)
            # Run tests
            if docker run --rm "temporal-agent-ts:$TAG"; then
                log_success "Tests passed"
            else
                log_error "Tests failed"
                exit 1
            fi
            ;;
    esac
}

# Show image information
show_image_info() {
    log_info "Image information:"
    docker images "temporal-agent-ts:$TAG" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    
    # Show image layers
    log_info "Image layers:"
    docker history "temporal-agent-ts:$TAG" --format "table {{.CreatedBy}}\t{{.Size}}" | head -10
}

# Push to registry (optional)
push_image() {
    if [[ -n "${DOCKER_REGISTRY:-}" ]]; then
        log_info "Pushing to registry: $DOCKER_REGISTRY"
        
        local registry_image="$DOCKER_REGISTRY/temporal-agent-ts:$TAG"
        
        # Tag for registry
        docker tag "temporal-agent-ts:$TAG" "$registry_image"
        
        # Push
        if docker push "$registry_image"; then
            log_success "Image pushed to registry"
        else
            log_error "Failed to push image to registry"
            exit 1
        fi
    fi
}

# Clean up build cache
cleanup_build_cache() {
    log_info "Cleaning up build cache..."
    docker builder prune -f
    log_success "Build cache cleaned"
}

# Main build process
main() {
    log_info "Starting build process..."
    log_info "Target: $TARGET"
    log_info "Tag: $TAG"
    
    validate_target
    check_prerequisites
    build_image
    
    # Optional operations based on flags
    if [[ "${SECURITY_SCAN:-}" == "true" ]]; then
        security_scan
    fi
    
    if [[ "${TEST_IMAGE:-}" == "true" ]]; then
        test_image
    fi
    
    if [[ "${PUSH_IMAGE:-}" == "true" ]]; then
        push_image
    fi
    
    show_image_info
    
    if [[ "${CLEANUP_CACHE:-}" == "true" ]]; then
        cleanup_build_cache
    fi
    
    log_success "Build completed successfully!"
    log_info "Image: temporal-agent-ts:$TAG"
    log_info "Target: $TARGET"
}

# Handle script arguments
case "${1:-}" in
    --all-targets)
        log_info "Building all targets..."
        for target in development production testing; do
            "$0" "$target" "$TAG"
        done
        ;;
    -h|--help)
        echo "Usage: $0 [target] [tag] [options]"
        echo ""
        echo "Targets: development, production, testing"
        echo "Environment variables:"
        echo "  DOCKER_REGISTRY   - Registry to push images to"
        echo "  SECURITY_SCAN     - Set to 'true' to run security scan"
        echo "  TEST_IMAGE        - Set to 'true' to test built image"
        echo "  PUSH_IMAGE        - Set to 'true' to push to registry"
        echo "  CLEANUP_CACHE     - Set to 'true' to cleanup build cache"
        echo ""
        echo "Options:"
        echo "  --all-targets     Build all targets"
        echo "  -h, --help        Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 production v1.0.0"
        echo "  SECURITY_SCAN=true TEST_IMAGE=true $0 production latest"
        echo "  DOCKER_REGISTRY=my-registry.com PUSH_IMAGE=true $0 production v1.0.0"
        exit 0
        ;;
    *)
        main
        ;;
esac