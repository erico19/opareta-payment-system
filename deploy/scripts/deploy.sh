#!/bin/bash
# Deployment script for Opareta Payment System

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_ENV=${1:-production}
LOG_DIR="./logs/deploy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/deploy_${TIMESTAMP}.log"

# Create log directory
mkdir -p "$LOG_DIR"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    log_success "All prerequisites met"
}

# Backup current deployment
backup_deployment() {
    log "Creating backup of current deployment..."
    local backup_dir="./backups/deploy_${TIMESTAMP}"
    mkdir -p "$backup_dir"
    
    if [ -f "docker-compose.yml" ]; then
        cp docker-compose.yml "$backup_dir/"
        log_success "Backed up docker-compose.yml"
    fi
    
    if [ -d "config" ]; then
        cp -r config "$backup_dir/"
        log_success "Backed up configuration"
    fi
}

# Pull latest images
pull_images() {
    log "Pulling latest images..."
    docker-compose pull || {
        log_error "Failed to pull images"
        return 1
    }
    log_success "Images pulled successfully"
}

# Build services
build_services() {
    log "Building Docker images..."
    docker-compose build --no-cache || {
        log_error "Build failed"
        return 1
    }
    log_success "Build completed successfully"
}

# Stop current services
stop_services() {
    log "Stopping current services..."
    docker-compose down || {
        log_warning "Some services may already be stopped"
    }
    log_success "Services stopped"
}

# Start new services
start_services() {
    log "Starting services..."
    docker-compose up -d || {
        log_error "Failed to start services"
        return 1
    }
    log_success "Services started"
}

# Health check
health_check() {
    log "Performing health checks..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:3001/auth/health > /dev/null 2>&1; then
            log_success "Auth service is healthy"
            if curl -s http://localhost:3002/health > /dev/null 2>&1; then
                log_success "Payment service is healthy"
                return 0
            fi
        fi
        
        attempt=$((attempt + 1))
        log "Health check attempt $attempt/$max_attempts..."
        sleep 2
    done
    
    log_error "Health checks failed after $max_attempts attempts"
    return 1
}

# Database migrations (if needed)
run_migrations() {
    log "Running database migrations..."
    # Add migration commands here based on your setup
    log_success "Migrations completed"
}

# Main deployment flow
main() {
    log "════════════════════════════════════════════"
    log "🚀 Starting Deployment - Environment: $DEPLOY_ENV"
    log "════════════════════════════════════════════"
    
    check_prerequisites
    backup_deployment
    pull_images
    build_services
    stop_services
    start_services
    run_migrations
    health_check
    
    log_success "════════════════════════════════════════════"
    log_success "✅ Deployment completed successfully!"
    log_success "════════════════════════════════════════════"
    log "Log file: $LOG_FILE"
}

# Error handling
trap 'log_error "Deployment failed"; exit 1' ERR

# Run main function
main "$@"
