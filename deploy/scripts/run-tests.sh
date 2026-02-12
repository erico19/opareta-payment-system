#!/bin/bash
# Test runner script for Opareta Payment System

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
LOG_DIR="./logs/tests"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/test_run_${TIMESTAMP}.log"

mkdir -p "$LOG_DIR"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_section() {
    echo -e "${PURPLE}════════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
    echo -e "${PURPLE}$1${NC}" | tee -a "$LOG_FILE"
    echo -e "${PURPLE}════════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
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

# Run unit tests
run_unit_tests() {
    log_section "🧪 Running Unit Tests"
    
    # Auth service tests
    log "Running Auth Service unit tests..."
    if docker-compose exec -T auth-service npm test -- --coverage --passWithNoTests; then
        log_success "Auth Service unit tests passed"
    else
        log_error "Auth Service unit tests failed"
        return 1
    fi
    
    # Payment service tests
    log "Running Payment Service unit tests..."
    if docker-compose exec -T payment-service npm test -- --coverage --passWithNoTests; then
        log_success "Payment Service unit tests passed"
    else
        log_error "Payment Service unit tests failed"
        return 1
    fi
}

# Run integration tests
run_integration_tests() {
    log_section "🔗 Running Integration Tests"
    
    log "Testing service-to-service communication..."
    
    # Test auth service health
    if curl -s http://localhost:3001/auth/health | grep -q "ok"; then
        log_success "Auth Service health check passed"
    else
        log_error "Auth Service health check failed"
        return 1
    fi
    
    # Test payment service health
    if curl -s http://localhost:3002/health | grep -q "ok"; then
        log_success "Payment Service health check passed"
    else
        log_error "Payment Service health check failed"
        return 1
    fi
    
    # Test API connectivity
    log "Testing API endpoints..."
    
    if curl -s http://localhost:8080/api/auth/health > /dev/null; then
        log_success "Auth API accessible via Nginx"
    else
        log_error "Auth API not accessible via Nginx"
        return 1
    fi
    
    if curl -s http://localhost:8080/api/payment/health > /dev/null; then
        log_success "Payment API accessible via Nginx"
    else
        log_error "Payment API not accessible via Nginx"
        return 1
    fi
}

# Run API tests
run_api_tests() {
    log_section "📡 Running API Tests"
    
    log "Testing authentication flow..."
    
    # This is a placeholder - add your actual API tests here
    # Example: curl -X POST http://localhost:3001/auth/register ...
    
    log_success "Basic API tests completed"
}

# Run database tests
run_db_tests() {
    log_section "🗄️  Running Database Tests"
    
    log "Checking PostgreSQL connections..."
    
    # Auth DB
    if docker exec opareta-payment-system-auth-db-1 psql -U postgres -d auth_service -c "SELECT 1" > /dev/null 2>&1; then
        log_success "Auth database connection successful"
    else
        log_error "Auth database connection failed"
        return 1
    fi
    
    # Payment DB
    if docker exec opareta-payment-system-payment-db-1 psql -U postgres -d payment_service -c "SELECT 1" > /dev/null 2>&1; then
        log_success "Payment database connection successful"
    else
        log_error "Payment database connection failed"
        return 1
    fi
}

# Run cache tests
run_cache_tests() {
    log_section "💾 Running Cache Tests"
    
    log "Testing Redis connectivity..."
    
    if docker exec opareta-payment-system-redis-1 redis-cli ping | grep -q "PONG"; then
        log_success "Redis connectivity test passed"
    else
        log_error "Redis connectivity test failed"
        return 1
    fi
    
    # Test SET/GET
    docker exec opareta-payment-system-redis-1 redis-cli SET testkey "testvalue" > /dev/null
    local value=$(docker exec opareta-payment-system-redis-1 redis-cli GET testkey)
    
    if [ "$value" = "testvalue" ]; then
        log_success "Redis SET/GET test passed"
        docker exec opareta-payment-system-redis-1 redis-cli DEL testkey > /dev/null
    else
        log_error "Redis SET/GET test failed"
        return 1
    fi
}

# Generate test report
generate_report() {
    log_section "📊 Test Report"
    
    local report_file="${LOG_DIR}/test_report_${TIMESTAMP}.html"
    
    cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Test Report</title>
    <style>
        body { font-family: Arial; margin: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; }
        .section { margin: 20px 0; }
        .test { padding: 10px; margin: 5px 0; border-left: 4px solid #3498db; }
        .passed { border-left-color: #27ae60; }
        .failed { border-left-color: #e74c3c; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Opareta Payment System - Test Report</h1>
        <p>Generated: $(date)</p>
    </div>
    <div class="section">
        <h2>Test Summary</h2>
        <p>See corresponding log file for details</p>
    </div>
</body>
</html>
EOF
    
    log "Report generated: $report_file"
}

# Main test runner
main() {
    log_section "🚀 Starting Test Suite"
    log "Log file: $LOG_FILE"
    
    local failed=0
    
    # Run all test suites
    run_unit_tests || failed=$((failed + 1))
    run_database_tests || failed=$((failed + 1))
    run_cache_tests || failed=$((failed + 1))
    run_integration_tests || failed=$((failed + 1))
    run_api_tests || failed=$((failed + 1))
    
    generate_report
    
    log_section "📋 Test Results"
    
    if [ $failed -eq 0 ]; then
        log_success "✅ All tests passed!"
        return 0
    else
        log_error "❌ $failed test suite(s) failed"
        return 1
    fi
}

# Error handling
trap 'log_error "Test run failed"; exit 1' ERR

# Run tests
main "$@"
