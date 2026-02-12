#!/bin/bash
# Rollback script for Opareta Payment System

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Get latest backup
get_latest_backup() {
    log "Looking for latest backup..."
    
    if [ ! -d "./backups" ]; then
        log_error "No backups directory found"
        return 1
    fi
    
    local latest_backup=$(ls -t ./backups/deploy_* 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        log_error "No deployment backups found"
        return 1
    fi
    
    echo "$latest_backup"
}

# Perform rollback
rollback() {
    log "════════════════════════════════════════════"
    log "⏮️  Starting Rollback Process"
    log "════════════════════════════════════════════"
    
    local backup_dir=$(get_latest_backup)
    
    if [ $? -ne 0 ]; then
        log_error "Cannot proceed without backup"
        return 1
    fi
    
    log "Found backup: $backup_dir"
    
    # Stop current services
    log "Stopping current services..."
    docker-compose down || {
        log_error "Failed to stop services"
        return 1
    }
    
    # Restore configuration
    log "Restoring configuration from backup..."
    if [ -f "$backup_dir/docker-compose.yml" ]; then
        cp "$backup_dir/docker-compose.yml" .
        log_success "Restored docker-compose.yml"
    fi
    
    if [ -d "$backup_dir/config" ]; then
        rm -rf config
        cp -r "$backup_dir/config" .
        log_success "Restored configuration directory"
    fi
    
    # Start with previous version
    log "Starting services with previous version..."
    docker-compose up -d || {
        log_error "Failed to start services"
        return 1
    }
    
    # Health check
    log "Running health checks..."
    sleep 10
    
    if curl -s http://localhost:3001/auth/health > /dev/null 2>&1; then
        log_success "✅ Services are running"
    else
        log_error "Services may not be running correctly"
        return 1
    fi
    
    log "════════════════════════════════════════════"
    log_success "✅ Rollback completed successfully!"
    log "════════════════════════════════════════════"
}

# Main
main() {
    # Confirm rollback
    read -p "Are you sure you want to rollback to the previous version? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Rollback cancelled"
        return 0
    fi
    
    rollback
}

main "$@"
