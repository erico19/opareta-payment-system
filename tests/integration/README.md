# Integration Tests Guide

## Overview

This directory contains comprehensive integration test suites that verify service interactions and end-to-end workflows for the Opareta Payment System.

---

## 📋 Test Files

### 1. auth-service.test.ts

**Purpose**: Verify authentication service functionality

**Tests**:
- Service health endpoint
- User registration flow
- User login with credentials
- JWT token validation
- Error handling and edge cases

**Running the tests**:
```bash
npm test tests/integration/auth-service.test.ts
```

**Example test**:
```typescript
it('should login with valid credentials', async () => {
  const response = await fetch('http://localhost:3001/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'password'
    })
  });
  expect(response.status).toBe(200);
});
```

---

### 2. payment-service.test.ts

**Purpose**: Verify payment service functionality

**Tests**:
- Service health endpoint
- Create new payments
- Retrieve payment details
- Update payment status
- View payment history
- Webhook event handling
- Authentication enforcement

**Running the tests**:
```bash
npm test tests/integration/payment-service.test.ts
```

**Example test**:
```typescript
it('should create a new payment', async () => {
  const response = await fetch('http://localhost:3002/payments', {
    method: 'POST',
    body: JSON.stringify({
      amount: 100,
      currency: 'USD',
      description: 'Test payment'
    })
  });
  expect(response.status).toBe(201);
});
```

---

### 3. api-gateway.test.ts

**Purpose**: Verify Nginx reverse proxy and load balancing

**Tests**:
- Request routing to backend services
- Load balancing distribution
- Rate limiting enforcement
- HTTPS/SSL support
- Error response handling
- Request/response header preservation
- Response compression

**Running the tests**:
```bash
npm test tests/integration/api-gateway.test.ts
```

**Example test**:
```typescript
it('should route auth requests to auth service', async () => {
  const response = await fetch('http://localhost:8080/api/auth/health');
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.status).toBe('ok');
});
```

---

### 4. system.test.ts

**Purpose**: End-to-end system integration tests

**Tests**:
- Complete payment workflow (register → login → create payment → verify)
- Concurrent payment handling
- Data persistence across service restarts
- Error recovery mechanisms
- Cross-service communication
- Performance requirements (response time < 1s)

**Running the tests**:
```bash
npm test tests/integration/system.test.ts
```

**Example test**:
```typescript
it('should complete full payment flow', async () => {
  // Register user
  const registerRes = await register();
  expect(registerRes.status).toBe(201);
  
  // Login
  const loginRes = await login();
  expect(loginRes.status).toBe(200);
  
  // Create payment
  const paymentRes = await createPayment(token);
  expect(paymentRes.status).toBe(201);
});
```

---

## 🚀 Running Tests

### Run All Integration Tests
```bash
npm test tests/integration/
```

### Run Specific Test File
```bash
npm test tests/integration/auth-service.test.ts
```

### Run with Coverage
```bash
npm test tests/integration/ --coverage
```

### Run with Verbose Output
```bash
npm test tests/integration/ --verbose
```

### Watch Mode (Re-run on file changes)
```bash
npm test tests/integration/ --watch
```

---

## 📋 Test Execution Order

Tests should be run in this order for optimal reliability:

1. **Infrastructure Tests** (Docker, ports, connectivity)
   ```bash
   ./deploy/scripts/health-check.sh
   ```

2. **Unit Tests** (Individual service logic)
   ```bash
   docker-compose exec auth-service npm test
   docker-compose exec payment-service npm test
   ```

3. **Integration Tests** (Service interactions)
   ```bash
   npm test tests/integration/
   ```

---

## 🔧 Test Configuration

### Jest Configuration

Tests use Jest testing framework. Configuration is in `jest.config.js`:

```javascript
{
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: {
    lines: 70,
    functions: 70,
    branches: 70,
    statements: 70
  }
}
```

### Test Timeouts

Default timeout: 30 seconds  
Adjust with: `jest.setTimeout(60000)`

---

## 📊 Test Coverage

Check test coverage:

```bash
npm test tests/integration/ --coverage

# Generate HTML report
npm test tests/integration/ --coverage --coverageReporters=html
open coverage/index.html
```

**Coverage Goals**:
- Statements: ≥ 70%
- Functions: ≥ 70%
- Branches: ≥ 60%
- Lines: ≥ 70%

---

## 🐛 Debugging Tests

### Enable Debug Logging

```bash
# Set debug environment variable
export DEBUG=*
npm test tests/integration/auth-service.test.ts
```

### Run Single Test

```bash
npm test tests/integration/auth-service.test.ts -t "should login with valid credentials"
```

### Step Through Tests

```bash
node --inspect-brk node_modules/.bin/jest tests/integration/auth-service.test.ts
```

Then open `chrome://inspect` in Chrome DevTools.

---

## 🔌 Service Dependencies

Tests depend on the following services running:

| Service | Port | Health Endpoint |
|---------|------|-----------------|
| Auth Service | 3001 | /auth/health |
| Payment Service | 3002 | /health |
| Nginx Gateway | 8080 | / |
| Redis | 6379 | PING |
| PostgreSQL (auth) | 5433 | - |
| PostgreSQL (payment) | 5434 | - |

**Start all services**:
```bash
docker-compose up -d
docker-compose ps  # Verify all running
```

---

## ✅ Pre-Test Checklist

Before running integration tests:

- [ ] All Docker containers running
- [ ] Services responding to health checks
- [ ] Database migrations completed
- [ ] Redis accessible
- [ ] Network connectivity verified
- [ ] Port forwarding configured (if needed)
- [ ] Environment variables set

```bash
# Verify setup
./deploy/scripts/health-check.sh
```

---

## 📈 Test Results Interpretation

### Success Output
```
PASS tests/integration/auth-service.test.ts
  Auth Service Integration Tests
    Health Check
      ✓ should return health status (125 ms)
    User Registration
      ✓ should register a new user (234 ms)
    User Login
      ✓ should login with valid credentials (156 ms)

Test Suites: 4 passed, 4 total
Tests: 32 passed, 32 total
```

### Failure Output
```
FAIL tests/integration/payment-service.test.ts
  Payment Service Integration Tests
    Create Payment
      ✗ should create a new payment (145 ms)

Expected: 201
Received: 500

Test Suites: 1 failed, 4 total
Tests: 1 failed, 31 passed
```

---

## 🔄 Common Issues & Solutions

### Tests Timeout

**Problem**: Tests take too long or timeout

**Solution**:
```bash
# Increase timeout
jest.setTimeout(60000)

# Or check if services are responding slowly
./deploy/scripts/health-check.sh
```

### Connection Refused

**Problem**: Cannot connect to service

**Solution**:
```bash
# Verify services are running
docker-compose ps

# Check port accessibility
curl http://localhost:3001/auth/health

# Restart services
docker-compose restart auth-service
```

### Database Connection Errors

**Problem**: Tests fail with database errors

**Solution**:
```bash
# Check database status
docker-compose logs auth-db

# Verify migrations ran
docker exec opareta-payment-system-auth-db-1 psql -U postgres -d auth_service -l

# Restart database
docker-compose restart auth-db
```

### Rate Limiting

**Problem**: Rate limit tests fail

**Solution**:
- Wait between test runs
- Clear rate limit state: `redis-cli FLUSHDB`
- Adjust rate limit in nginx.conf if needed

---

## 🎯 Test Strategy

### Unit Tests vs Integration Tests

| Aspect | Unit Tests | Integration Tests |
|--------|-----------|-------------------|
| Scope | Single function | Multiple services |
| Speed | Fast (ms) | Slower (s) |
| Setup | Minimal | Docker running |
| Dependencies | Mocked | Real services |
| Location | services/*/src/__tests__ | tests/integration/ |

### Running Tests in CI/CD

```yaml
# .github/workflows/test.yml
- name: Run Integration Tests
  run: |
    docker-compose up -d
    sleep 30  # Wait for services
    npm test tests/integration/
    
- name: Generate Coverage
  run: npm test tests/integration/ --coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v2
```

---

## 📚 Best Practices

### Writing New Integration Tests

1. **Use descriptive test names**
   ```typescript
   // Good
   it('should create a payment with valid data', async () => {})
   
   // Bad
   it('test payment', async () => {})
   ```

2. **Test both success and failure cases**
   ```typescript
   it('should create payment', async () => { /* success */ })
   it('should reject invalid amount', async () => { /* failure */ })
   ```

3. **Clean up after tests**
   ```typescript
   afterEach(async () => {
     // Delete test data
     await redis.flushdb()
   })
   ```

4. **Use meaningful assertions**
   ```typescript
   // Good
   expect(response.status).toBe(201)
   expect(data.payment_id).toBeDefined()
   
   // Less clear
   expect(response).toBeTruthy()
   ```

---

## 🔐 Test Security

### Avoid Hardcoding Credentials

```typescript
// Bad
const token = 'hardcoded-token-123'

// Good
const token = process.env.TEST_TOKEN || await loginTestUser()
```

### Use Test-Specific Data

```typescript
const testEmail = `test-${Date.now()}@example.com`
```

### Clean Up Test Data

```typescript
afterEach(async () => {
  await db.deleteWhere({ email: /^test-/ })
})
```

---

## 📞 Support & Contribution

### Running Tests Locally

```bash
# Clone repo
git clone https://github.com/erico19/opareta-payment-system.git
cd opareta-payment-system

# Install dependencies
npm install

# Start services
docker-compose up -d

# Run tests
npm test tests/integration/
```

### Contributing Tests

1. Create feature branch
2. Add tests for new functionality
3. Ensure all tests pass
4. Submit pull request

### Getting Help

- Check logs: `docker-compose logs`
- Read troubleshooting section above
- Contact development team

---

**Last Updated**: December 11, 2025  
**Status**: ✅ Production Ready
