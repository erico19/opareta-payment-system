# Deploy Scripts & Integration Tests

## Overview

This directory contains deployment automation scripts and comprehensive integration test suites for the Opareta Payment System.

---

## 📁 Directory Structure

```
deploy/
├── scripts/
│   ├── deploy.sh              # Main deployment script
│   ├── health-check.sh        # Service health verification
│   ├── rollback.sh            # Rollback to previous version
│   └── run-tests.sh           # Test suite runner
│
└── ansible/
    └── playbook.yml           # Server provisioning

tests/
├── integration/
│   ├── auth-service.test.ts        # Auth service tests
│   ├── payment-service.test.ts     # Payment service tests
│   ├── api-gateway.test.ts         # Nginx/gateway tests
│   └── system.test.ts              # End-to-end tests
│
└── unit/
    └── (Service-level unit tests in services/ directory)
```

---

## 🚀 Deployment Scripts

### 1. **deploy.sh** - Main Deployment Script

Automates the complete deployment process with backup and health checks.

**Usage:**
```bash
chmod +x deploy/scripts/deploy.sh
./deploy/scripts/deploy.sh [production|staging|development]
```

**What it does:**
- ✅ Checks prerequisites (Docker, Docker Compose)
- ✅ Creates backup of current deployment
- ✅ Pulls latest images
- ✅ Builds Docker images (if needed)
- ✅ Stops current services gracefully
- ✅ Starts new services
- ✅ Runs database migrations
- ✅ Performs health checks
- ✅ Logs all actions

**Output:**
- Log file: `logs/deploy/deploy_YYYYMMDD_HHMMSS.log`
- Backup directory: `backups/deploy_YYYYMMDD_HHMMSS/`

**Environment Variables:**
- `DEPLOY_ENV`: Set environment (default: production)

---

### 2. **health-check.sh** - Service Health Verification

Checks the health status of all services and components.

**Usage:**
```bash
chmod +x deploy/scripts/health-check.sh
./deploy/scripts/health-check.sh
```

**Checks:**
- ✅ Docker containers running
- ✅ Auth Service health (port 3001)
- ✅ Payment Service health (port 3002)
- ✅ Redis connectivity (port 6379)
- ✅ Prometheus metrics (port 9090)
- ✅ Grafana dashboards (port 3000)

**Exit Code:**
- 0: All services healthy
- 1: One or more services unhealthy

---

### 3. **rollback.sh** - Deployment Rollback

Reverts to the previous deployment version.

**Usage:**
```bash
chmod +x deploy/scripts/rollback.sh
./deploy/scripts/rollback.sh
```

**What it does:**
- Confirms rollback action
- Finds latest backup
- Stops current services
- Restores previous configuration
- Starts services with previous version
- Performs health checks

**Safety Features:**
- ⚠️ Requires confirmation before rollback
- 📦 Uses automated backups from deploy.sh
- 🔍 Verifies services are running after rollback

---

### 4. **run-tests.sh** - Comprehensive Test Runner

Executes all test suites (unit, integration, database, cache, API).

**Usage:**
```bash
chmod +x deploy/scripts/run-tests.sh
./deploy/scripts/run-tests.sh
```

**Test Suites:**
1. **Unit Tests** - Service-level tests
   - Auth service unit tests
   - Payment service unit tests
   - Code coverage reports

2. **Database Tests** - Database connectivity and operations
   - PostgreSQL auth database
   - PostgreSQL payment database

3. **Cache Tests** - Redis cache operations
   - Redis connectivity (PING)
   - SET/GET operations
   - Key deletion

4. **Integration Tests** - Service-to-service communication
   - Health check endpoints
   - API routing through Nginx
   - Service discovery

5. **API Tests** - REST API endpoints
   - Authentication flow
   - Payment operations
   - Error handling

**Output:**
- Log file: `logs/tests/test_run_YYYYMMDD_HHMMSS.log`
- HTML report: `logs/tests/test_report_YYYYMMDD_HHMMSS.html`

---

## 🧪 Integration Tests

Integration tests verify complete workflows and service interactions.

### Test Files

#### 1. **auth-service.test.ts**

Tests the authentication service:
- Health check endpoint
- User registration
- User login
- Token validation
- Error handling

**Key Test Cases:**
```
✅ Health check returns service status
✅ Register new user with validation
✅ Reject duplicate email addresses
✅ Login with valid credentials
✅ Reject invalid credentials
✅ Validate JWT tokens
✅ Reject invalid tokens
```

#### 2. **payment-service.test.ts**

Tests the payment processing service:
- Create payments
- Retrieve payment details
- Update payment status
- View payment history
- Webhook handling
- Authentication/authorization

**Key Test Cases:**
```
✅ Create payment with valid data
✅ Validate required fields
✅ Retrieve payment by reference
✅ Return 404 for non-existent payments
✅ Update payment status
✅ Get payment history
✅ Handle webhook events
✅ Reject unauthenticated requests
```

#### 3. **api-gateway.test.ts**

Tests Nginx reverse proxy and load balancing:
- Request routing to backend services
- Load distribution
- Rate limiting
- SSL/TLS
- Error handling
- Header preservation
- Gzip compression

**Key Test Cases:**
```
✅ Route auth requests correctly
✅ Route payment requests correctly
✅ Route metrics requests to Prometheus
✅ Distribute load across backends
✅ Enforce rate limits
✅ Handle HTTPS connections
✅ Return proper error responses
✅ Preserve request/response headers
✅ Compress responses with gzip
```

#### 4. **system.test.ts**

End-to-end system tests:
- Complete payment workflows
- Concurrent operations
- Data persistence
- Error recovery
- Cross-service communication
- Performance metrics

**Key Test Cases:**
```
✅ Complete payment flow: register -> login -> pay -> verify
✅ Handle 5 concurrent payments
✅ Persist data across service restarts
✅ Recover from temporary unavailability
✅ Cross-service token validation
✅ Response time requirements (< 1s)
```

---

## 🔄 CI/CD Integration

### Using with GitHub Actions

Example GitHub Actions workflow:

```yaml
name: Deploy & Test

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Run tests
        run: |
          chmod +x deploy/scripts/run-tests.sh
          ./deploy/scripts/run-tests.sh
      
      - name: Check health
        run: |
          chmod +x deploy/scripts/health-check.sh
          ./deploy/scripts/health-check.sh

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to production
        run: |
          chmod +x deploy/scripts/deploy.sh
          ./deploy/scripts/deploy.sh production
```

### Using with GitLab CI

```yaml
stages:
  - test
  - deploy
  - verify

test:
  stage: test
  script:
    - chmod +x deploy/scripts/run-tests.sh
    - ./deploy/scripts/run-tests.sh

deploy:
  stage: deploy
  script:
    - chmod +x deploy/scripts/deploy.sh
    - ./deploy/scripts/deploy.sh production
  only:
    - main

verify:
  stage: verify
  script:
    - chmod +x deploy/scripts/health-check.sh
    - ./deploy/scripts/health-check.sh
```

---

## 🧠 Running Tests Locally

### Prerequisites
```bash
# Ensure Docker and Docker Compose are running
docker-compose up -d

# Wait for services to start
sleep 30
```

### Run All Tests
```bash
./deploy/scripts/run-tests.sh
```

### Run Specific Test Suite
```bash
# Unit tests only
docker-compose exec auth-service npm test

# Integration tests (requires Jest)
npm install -D jest
npm test tests/integration/auth-service.test.ts
```

### View Results
```bash
# View latest log
cat logs/tests/test_run_*.log | tail -100

# View HTML report
open logs/tests/test_report_*.html
```

---

## 📊 Deployment Workflow

### Standard Deployment

1. **Prepare**
   ```bash
   git pull origin main
   ```

2. **Run Tests**
   ```bash
   ./deploy/scripts/run-tests.sh
   ```

3. **Health Check**
   ```bash
   ./deploy/scripts/health-check.sh
   ```

4. **Deploy**
   ```bash
   ./deploy/scripts/deploy.sh production
   ```

5. **Verify**
   ```bash
   ./deploy/scripts/health-check.sh
   ```

### Rollback Procedure

```bash
# If deployment fails:
./deploy/scripts/rollback.sh

# Verify rollback
./deploy/scripts/health-check.sh
```

---

## 🔧 Configuration

### Environment Variables

Create `.env` file in project root:

```env
# Deployment
DEPLOY_ENV=production
MAX_RETRIES=5
HEALTH_CHECK_TIMEOUT=30

# Database
DB_HOST=auth-db
DB_USER=postgres
DB_PASSWORD=secure_password

# Services
AUTH_SERVICE_URL=http://auth-service:3001
PAYMENT_SERVICE_URL=http://payment-service:3002
REDIS_URL=redis://redis:6379
```

### Script Configuration

Edit script variables (top of each script file):

```bash
# Maximum health check attempts
max_attempts=30

# Service check timeout
timeout=5

# Backup retention
backup_retention_days=7
```

---

## 📈 Monitoring & Logging

### Log Locations

```
logs/
├── deploy/
│   └── deploy_YYYYMMDD_HHMMSS.log
├── tests/
│   ├── test_run_YYYYMMDD_HHMMSS.log
│   └── test_report_YYYYMMDD_HHMMSS.html
└── [service logs via docker-compose logs]
```

### View Logs

```bash
# Deployment logs
tail -f logs/deploy/deploy_*.log

# Test logs
tail -f logs/tests/test_run_*.log

# Container logs
docker-compose logs -f auth-service
docker-compose logs -f payment-service
```

### Monitoring Dashboard

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Application Health**: http://localhost:8080/health

---

## 🚨 Troubleshooting

### Deployment Fails

1. Check logs: `logs/deploy/deploy_*.log`
2. Verify prerequisites: `docker -v && docker-compose -v`
3. Check disk space: `df -h`
4. Retry deployment

### Tests Failing

1. Ensure services are running: `docker-compose ps`
2. Check service health: `./deploy/scripts/health-check.sh`
3. Review test logs: `logs/tests/test_run_*.log`
4. Check service logs: `docker-compose logs auth-service`

### Health Check Issues

1. Verify all containers are running
2. Check port accessibility
3. Review service logs
4. Restart specific service: `docker-compose restart auth-service`

---

## 🔐 Security Considerations

### Best Practices

- ✅ Keep scripts executable by authorized users only
- ✅ Use environment variables for sensitive data
- ✅ Enable audit logging
- ✅ Regularly test rollback procedures
- ✅ Maintain backup retention policy
- ✅ Use SSH keys for authentication
- ✅ Enable TLS for all communications

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Health checks passing
- [ ] Backup created successfully
- [ ] Team notified of deployment
- [ ] Rollback plan ready
- [ ] Monitoring alerts configured
- [ ] Communication channels open

---

## 📞 Support

For issues or questions:
1. Check log files
2. Review error messages
3. Consult troubleshooting section
4. Contact DevOps team

---

**Last Updated**: December 11, 2025  
**Status**: ✅ Production Ready
