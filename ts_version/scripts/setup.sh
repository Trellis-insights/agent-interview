#!/bin/bash

# Setup script for Temporal Agent TypeScript
# Usage: ./scripts/setup.sh [environment]

set -e

# Default values
ENVIRONMENT=${1:-development}
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

# Check system requirements
check_system_requirements() {
    log_info "Checking system requirements..."
    
    # Check Node.js version
    if command -v node &> /dev/null; then
        local node_version=$(node -v | sed 's/v//')
        local required_version="18.0.0"
        
        if [[ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" == "$required_version" ]]; then
            log_success "Node.js version $node_version is compatible"
        else
            log_error "Node.js version $node_version is too old. Required: $required_version+"
            exit 1
        fi
    else
        log_error "Node.js is not installed"
        log_info "Please install Node.js from https://nodejs.org/"
        exit 1
    fi
    
    # Check npm version
    if command -v npm &> /dev/null; then
        local npm_version=$(npm -v)
        log_success "npm version $npm_version found"
    else
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check Docker (optional for non-Docker deployments)
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            log_success "Docker is installed and running"
        else
            log_warning "Docker is installed but not running"
        fi
    else
        log_warning "Docker is not installed (optional for development)"
    fi
    
    # Check Docker Compose (optional)
    if command -v docker-compose &> /dev/null; then
        log_success "Docker Compose is available"
    else
        log_warning "Docker Compose is not installed (optional for development)"
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    cd "$PROJECT_DIR"
    
    # Clean install
    if [[ -d "node_modules" ]]; then
        log_info "Cleaning existing node_modules..."
        rm -rf node_modules
    fi
    
    if [[ -f "package-lock.json" ]]; then
        log_info "Using package-lock.json for consistent installs"
        npm ci
    else
        log_info "Installing packages and generating package-lock.json"
        npm install
    fi
    
    log_success "Dependencies installed successfully"
}

# Setup environment configuration
setup_environment() {
    log_info "Setting up environment configuration..."
    
    cd "$PROJECT_DIR"
    
    local env_file=".env.$ENVIRONMENT"
    local example_file=".env.example"
    
    # Create environment file if it doesn't exist
    if [[ ! -f "$env_file" ]]; then
        if [[ -f "$example_file" ]]; then
            log_info "Creating $env_file from $example_file"
            cp "$example_file" "$env_file"
            
            # Update environment-specific values
            case $ENVIRONMENT in
                development)
                    sed -i.bak 's/NODE_ENV=.*/NODE_ENV=development/' "$env_file"
                    sed -i.bak 's/PORT=.*/PORT=3000/' "$env_file"
                    sed -i.bak 's/LOG_LEVEL=.*/LOG_LEVEL=debug/' "$env_file"
                    ;;
                staging)
                    sed -i.bak 's/NODE_ENV=.*/NODE_ENV=staging/' "$env_file"
                    sed -i.bak 's/PORT=.*/PORT=8000/' "$env_file"
                    sed -i.bak 's/LOG_LEVEL=.*/LOG_LEVEL=info/' "$env_file"
                    ;;
                production)
                    sed -i.bak 's/NODE_ENV=.*/NODE_ENV=production/' "$env_file"
                    sed -i.bak 's/PORT=.*/PORT=8000/' "$env_file"
                    sed -i.bak 's/LOG_LEVEL=.*/LOG_LEVEL=warn/' "$env_file"
                    ;;
            esac
            
            # Clean up backup file
            rm -f "$env_file.bak"
            
            log_success "Environment file created: $env_file"
        else
            log_warning "No example environment file found"
        fi
    else
        log_info "Environment file already exists: $env_file"
    fi
    
    # Create main .env symlink for development
    if [[ "$ENVIRONMENT" == "development" && ! -f ".env" ]]; then
        ln -s "$env_file" ".env"
        log_success "Created .env symlink to $env_file"
    fi
}

# Setup directories
setup_directories() {
    log_info "Setting up project directories..."
    
    cd "$PROJECT_DIR"
    
    # Create necessary directories
    local directories=(
        "logs"
        "dist"
        "coverage"
        "docker/temporal/dynamicconfig"
        "docker/nginx"
        "docker/postgres/init"
        "docker/prometheus"
        "docker/grafana/provisioning"
        "k8s"
    )
    
    for dir in "${directories[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log_info "Created directory: $dir"
        fi
    done
    
    log_success "Project directories created"
}

# Initialize database (for development)
init_database() {
    if [[ "$ENVIRONMENT" == "development" ]]; then
        log_info "Initializing development database..."
        
        # Check if Docker is available
        if command -v docker &> /dev/null && docker info &> /dev/null; then
            cd "$PROJECT_DIR"
            
            # Start PostgreSQL for Temporal
            if ! docker ps | grep -q postgres; then
                log_info "Starting PostgreSQL container..."
                docker run -d \
                    --name temporal-postgres \
                    -e POSTGRES_PASSWORD=temporal \
                    -e POSTGRES_USER=temporal \
                    -e POSTGRES_DB=temporal \
                    -p 5432:5432 \
                    postgres:13-alpine
                
                # Wait for database to be ready
                log_info "Waiting for database to be ready..."
                sleep 10
            fi
            
            log_success "Database initialized"
        else
            log_warning "Docker not available, skipping database initialization"
        fi
    fi
}

# Setup Temporal (for development)
setup_temporal() {
    if [[ "$ENVIRONMENT" == "development" ]]; then
        log_info "Setting up Temporal development server..."
        
        # Check if Temporal CLI is installed
        if command -v temporal &> /dev/null; then
            log_success "Temporal CLI is installed"
        else
            log_warning "Temporal CLI not found"
            log_info "Install from: https://docs.temporal.io/cli"
        fi
        
        # Create Temporal dynamic config for development
        cat > "docker/temporal/dynamicconfig/development.yaml" << EOF
system.forceSearchAttributesCacheRefreshOnRead:
  - value: true
system.enableLoggerKey:
  - value: true
frontend.enableUpdateWorkflowExecution:
  - value: true
frontend.enableUpdateWorkflowExecutionAsyncAccepted:
  - value: true
EOF
        
        log_success "Temporal configuration created"
    fi
}

# Run initial tests
run_initial_tests() {
    log_info "Running initial tests..."
    
    cd "$PROJECT_DIR"
    
    # Type check
    if npm run type-check; then
        log_success "TypeScript compilation successful"
    else
        log_error "TypeScript compilation failed"
        exit 1
    fi
    
    # Lint check
    if npm run lint; then
        log_success "Linting passed"
    else
        log_warning "Linting issues found (run 'npm run lint:fix' to auto-fix)"
    fi
    
    # Run tests (only in development to avoid long setup times)
    if [[ "$ENVIRONMENT" == "development" ]]; then
        if npm test; then
            log_success "Tests passed"
        else
            log_warning "Some tests failed (check test output)"
        fi
    fi
}

# Generate documentation
generate_docs() {
    log_info "Generating documentation..."
    
    cd "$PROJECT_DIR"
    
    # Create docs directory if it doesn't exist
    mkdir -p docs
    
    # Generate API documentation (if TypeDoc is installed)
    if npm list typedoc &> /dev/null; then
        npx typedoc --out docs/api src
        log_success "API documentation generated in docs/api"
    else
        log_info "TypeDoc not installed, skipping API documentation generation"
    fi
}

# Setup Git hooks (optional)
setup_git_hooks() {
    if [[ -d ".git" ]]; then
        log_info "Setting up Git hooks..."
        
        # Pre-commit hook
        cat > ".git/hooks/pre-commit" << 'EOF'
#!/bin/sh
# Pre-commit hook for Temporal Agent TypeScript

set -e

echo "Running pre-commit checks..."

# Type check
npm run type-check

# Lint
npm run lint

# Run tests
npm test

echo "Pre-commit checks passed!"
EOF
        
        chmod +x ".git/hooks/pre-commit"
        log_success "Git pre-commit hook installed"
    else
        log_info "Not a Git repository, skipping Git hooks setup"
    fi
}

# Display setup summary
display_summary() {
    log_success "Setup completed successfully!"
    echo ""
    log_info "=== Setup Summary ==="
    log_info "Environment: $ENVIRONMENT"
    log_info "Project directory: $PROJECT_DIR"
    log_info "Configuration file: .env.$ENVIRONMENT"
    echo ""
    log_info "=== Next Steps ==="
    
    case $ENVIRONMENT in
        development)
            echo "1. Update .env.development with your API keys"
            echo "2. Start Temporal server: temporal server start-dev"
            echo "3. Start development server: npm run dev"
            echo "4. Open http://localhost:3000"
            echo ""
            echo "Optional Docker setup:"
            echo "  docker-compose up -d"
            ;;
        staging|production)
            echo "1. Update .env.$ENVIRONMENT with production values"
            echo "2. Build Docker image: ./scripts/build.sh $ENVIRONMENT"
            echo "3. Deploy: ./scripts/deploy.sh $ENVIRONMENT"
            ;;
    esac
    
    echo ""
    log_info "For help: ./scripts/setup.sh --help"
}

# Main setup process
main() {
    log_info "Starting setup for environment: $ENVIRONMENT"
    
    check_system_requirements
    install_dependencies
    setup_environment
    setup_directories
    
    if [[ "$ENVIRONMENT" == "development" ]]; then
        init_database
        setup_temporal
    fi
    
    run_initial_tests
    generate_docs
    
    if [[ "$ENVIRONMENT" == "development" ]]; then
        setup_git_hooks
    fi
    
    display_summary
}

# Handle script arguments
case "${1:-}" in
    -h|--help)
        echo "Usage: $0 [environment] [options]"
        echo ""
        echo "Environments: development, staging, production"
        echo ""
        echo "This script will:"
        echo "  - Check system requirements"
        echo "  - Install Node.js dependencies"
        echo "  - Setup environment configuration"
        echo "  - Create necessary directories"
        echo "  - Initialize database (development only)"
        echo "  - Setup Temporal configuration"
        echo "  - Run initial tests"
        echo "  - Generate documentation"
        echo "  - Setup Git hooks (development only)"
        echo ""
        echo "Options:"
        echo "  -h, --help        Show this help message"
        exit 0
        ;;
    development|staging|production)
        main
        ;;
    *)
        if [[ -n "${1:-}" ]]; then
            log_error "Invalid environment: $1"
            log_info "Valid environments: development, staging, production"
            exit 1
        else
            main
        fi
        ;;
esac