#!/bin/bash
# Health check script for Opareta Payment System

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

# Check Auth Service
check_auth_service() {
    log "Checking Auth Service (localhost:3001)..."
    if curl -s http://localhost:3001/auth/health | grep -q "ok"; then
        log_success "Auth Service is healthy"
        return 0
    else
        log_error "Auth Service is unhealthy"
        return 1
    fi
}

# Check Payment Service
check_payment_service() {
    log "Checking Payment Service (localhost:3002)..."
    if curl -s http://localhost:3002/health | grep -q "ok"; then
        log_success "Payment Service is healthy"
        return 0
    else
        log_error "Payment Service is unhealthy"
        return 1
    fi
}

# Check Redis
check_redis() {
    log "Checking Redis (localhost:6379)..."
    if docker exec opareta-payment-system-redis-1 redis-cli ping | grep -q "PONG"; then
        log_success "Redis is healthy"
        return 0
    else
        log_error "Redis is unhealthy"
        return 1
    fi
}

# Check Prometheus
check_prometheus() {
    log "Checking Prometheus (localhost:9090)..."
    if curl -s http://localhost:9090/-/healthy | grep -q "Prometheus"; then
        log_success "Prometheus is healthy"
        return 0
    else
        log_error "Prometheus is unhealthy"
        return 1
    fi
}

# Check Grafana
check_grafana() {
    log "Checking Grafana (localhost:3000)..."
    if curl -s http://localhost:3000/api/health | grep -q "ok"; then
        log_success "Grafana is healthy"
        return 0
    else
        log_error "Grafana is unhealthy"
        return 1
    fi
}

# Check all containers
check_containers() {
    log "Checking Docker containers..."
    local all_healthy=true
    
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "opareta" | while read line; do
        container_name=$(echo "$line" | awk '{print $1}')
        status=$(echo "$line" | awk '{$1=""; print $0}')
        
        if [[ "$status" == *"healthy"* ]] || [[ "$status" == *"Up"* ]]; then
            log_success "$container_name: $status"
        else
            log_error "$container_name: $status"
            all_healthy=false
        fi
    done
    
    return 0
}

# Main health check
main() {
    log "════════════════════════════════════════════"
    log "🏥 Running Health Checks"
    log "════════════════════════════════════════════"
    
    local failed=0
    
    check_containers || failed=$((failed + 1))
    check_redis || failed=$((failed + 1))
    check_auth_service || failed=$((failed + 1))
    check_payment_service || failed=$((failed + 1))
    check_prometheus || failed=$((failed + 1))
    check_grafana || failed=$((failed + 1))
    
    log "════════════════════════════════════════════"
    
    if [ $failed -eq 0 ]; then
        log_success "✅ All services are healthy!"
        return 0
    else
        log_error "❌ $failed service(s) failed health check"
        return 1
    fi
}

main "$@"
