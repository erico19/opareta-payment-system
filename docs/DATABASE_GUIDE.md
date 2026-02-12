# Database Guide - Opareta Payment System

## Overview

The Opareta Payment System uses two separate PostgreSQL databases:

| Database | Port | User | Password | Purpose |
|----------|------|------|----------|---------|
| **auth_service** | 5433 | auth_user | auth_pass | User authentication, sessions |
| **payment_service** | 5434 | payment_user | payment_pass | Payment records, webhooks, audit logs |

Both databases are running in Docker containers and persist data in named volumes.

---

## Database Schemas

### Auth Database (`auth_service`)

#### Tables

**1. users**
```sql
Column          | Type      | Description
----------------|-----------|---------------------------
id              | UUID      | Unique user identifier
phone_number    | VARCHAR   | Phone number (unique)
email           | VARCHAR   | Email address (unique)
password_hash   | VARCHAR   | Hashed password
is_active       | BOOLEAN   | Account active status
created_at      | TIMESTAMP | Account creation time
updated_at      | TIMESTAMP | Last update time
```

**2. user_sessions**
```sql
Column          | Type      | Description
----------------|-----------|---------------------------
id              | UUID      | Session ID
user_id         | UUID      | Reference to user
token           | VARCHAR   | JWT token
expires_at      | TIMESTAMP | Token expiration
created_at      | TIMESTAMP | Session creation time
```

### Payment Database (`payment_service`)

#### Tables

**1. payments**
```sql
Column                  | Type      | Description
------------------------|-----------|---------------------------
id                      | UUID      | Unique payment ID
reference               | VARCHAR   | Payment reference (OP...)
amount                  | DECIMAL   | Payment amount
currency                | VARCHAR   | Currency code (UGX, USD)
payment_method          | VARCHAR   | Method (MOBILE_MONEY, CARD, BANK_TRANSFER)
customer_phone          | VARCHAR   | Customer phone number
customer_email          | VARCHAR   | Customer email
status                  | VARCHAR   | Status (INITIATED, PENDING, SUCCESS, FAILED)
provider_transaction_id | VARCHAR   | Provider transaction ID
provider_name           | VARCHAR   | Payment provider name
metadata                | JSON      | Additional metadata
created_at              | TIMESTAMP | Payment creation time
updated_at              | TIMESTAMP | Last update time
```

**2. webhook_events**
```sql
Column              | Type      | Description
--------------------|-----------|---------------------------
id                  | UUID      | Event ID
payment_id          | UUID      | Reference to payment
event_type          | VARCHAR   | Event type
payload             | JSON      | Event payload
processed           | BOOLEAN   | Processing status
created_at          | TIMESTAMP | Event creation time
processed_at        | TIMESTAMP | Processing time
```

**3. payment_audit_log**
```sql
Column          | Type      | Description
----------------|-----------|---------------------------
id              | UUID      | Log entry ID
payment_id      | UUID      | Reference to payment
old_status      | VARCHAR   | Previous status
new_status      | VARCHAR   | New status
changed_by      | VARCHAR   | Who made the change
reason          | VARCHAR   | Reason for change
created_at      | TIMESTAMP | Log creation time
```

---

## Accessing Databases

### Method 1: GUI Tool (DBeaver - Recommended)

1. Download **DBeaver Community Edition** (free)
   - https://dbeaver.io/download/

2. Create Connection → PostgreSQL

3. **Auth Database Connection:**
   ```
   Host: localhost
   Port: 5433
   Database: auth_service
   Username: auth_user
   Password: auth_pass
   ```

4. **Payment Database Connection:**
   ```
   Host: localhost
   Port: 5434
   Database: payment_service
   Username: payment_user
   Password: payment_pass
   ```

### Method 2: Command Line (psql)

#### List all tables

**Auth Database:**
```bash
docker exec opareta-payment-system-auth-db-1 psql -U auth_user -d auth_service -c "\dt"
```

**Payment Database:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "\dt"
```

#### Query data

**View all users:**
```bash
docker exec opareta-payment-system-auth-db-1 psql -U auth_user -d auth_service -c "SELECT id, phone_number, email, is_active, created_at FROM users;"
```

**View all payments:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "SELECT reference, amount, currency, status, created_at FROM payments;"
```

**View payment history for a specific user:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "SELECT reference, amount, status FROM payments WHERE customer_email = 'user@example.com';"
```

### Method 3: Docker Exec Interactive Shell

```bash
# Connect to auth database
docker exec -it opareta-payment-system-auth-db-1 psql -U auth_user -d auth_service

# Connect to payment database
docker exec -it opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service
```

Then use SQL commands:
```sql
-- List tables
\dt

-- Describe table structure
\d users

-- Query data
SELECT * FROM users;

-- Exit
\q
```

---

## Database Tests & Checks

### Test 1: Database Connectivity

**Auth Database:**
```bash
docker exec opareta-payment-system-auth-db-1 pg_isready -U auth_user -d auth_service
```

**Payment Database:**
```bash
docker exec opareta-payment-system-payment-db-1 pg_isready -U payment_user -d payment_service
```

Expected output:
```
localhost:5432 - accepting connections
```

### Test 2: User Registration Flow

**Register a test user:**
```powershell
$body = @{
    phone_number = "+256700000100"
    email = "testuser@example.com"
    password = "TestPass123"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8080/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing
```

**Verify in database:**
```bash
docker exec opareta-payment-system-auth-db-1 psql -U auth_user -d auth_service -c "SELECT phone_number, email FROM users WHERE email = 'testuser@example.com';"
```

### Test 3: Login & Token Generation

**Login:**
```powershell
$body = @{
    phone_number = "+256700000100"
    password = "TestPass123"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:8080/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing

$token = ($response.Content | ConvertFrom-Json).token
Write-Host "Token: $token"
```

**Verify in database:**
```bash
docker exec opareta-payment-system-auth-db-1 psql -U auth_user -d auth_service -c "SELECT token, expires_at FROM user_sessions ORDER BY created_at DESC LIMIT 1;"
```

### Test 4: Payment Creation

**Create a payment:**
```powershell
$body = @{
    amount = 1000
    currency = "UGX"
    payment_method = "MOBILE_MONEY"
    customer_phone = "+256700000100"
    customer_email = "testuser@example.com"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:8080/payments" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -Headers @{Authorization = "Bearer $token"} `
    -UseBasicParsing

$paymentRef = ($response.Content | ConvertFrom-Json).reference
Write-Host "Payment Reference: $paymentRef"
```

**Verify in database:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "SELECT reference, amount, currency, status FROM payments WHERE reference = 'OP...';"
```

### Test 5: Payment Status Update

**Update payment status:**
```powershell
Invoke-WebRequest -Uri "http://localhost:8080/payments/$paymentRef/status" `
    -Method PATCH `
    -ContentType "application/json" `
    -Body (@{status = "SUCCESS"} | ConvertTo-Json) `
    -Headers @{Authorization = "Bearer $token"} `
    -UseBasicParsing
```

**Verify in database:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "SELECT reference, status, updated_at FROM payments WHERE reference = 'OP...';"
```

**Check audit log:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "SELECT old_status, new_status, changed_by FROM payment_audit_log WHERE payment_id = (SELECT id FROM payments WHERE reference = 'OP...');"
```

### Test 6: Payment History Retrieval

**Get payment history:**
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:8080/payments/history/all" `
    -Method GET `
    -Headers @{Authorization = "Bearer $token"} `
    -UseBasicParsing

$payments = $response.Content | ConvertFrom-Json
$payments.payments | Format-Table reference, amount, status, created_at
```

**Verify in database:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "SELECT COUNT(*) as total_payments, COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successful, COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed FROM payments;"
```

### Test 7: Webhook Events

**Simulate webhook:**
```powershell
$body = @{
    payment_reference = "OP..."
    status = "SUCCESS"
    provider_transaction_id = "PROV123"
    timestamp = (Get-Date).ToUniversalTime().ToString("O")
    idempotency_key = "demo-$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8080/webhooks/simulate" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -Headers @{Authorization = "Bearer $token"} `
    -UseBasicParsing
```

**Verify in database:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "SELECT event_type, processed FROM webhook_events ORDER BY created_at DESC LIMIT 5;"
```

---

## Database Health Checks

### Check Docker Container Health

```bash
# Check auth database
docker ps --filter "name=auth-db" --format "table {{.Names}}\t{{.Status}}"

# Check payment database
docker ps --filter "name=payment-db" --format "table {{.Names}}\t{{.Status}}"
```

### Check Database Disk Usage

```bash
# Auth database
docker exec opareta-payment-system-auth-db-1 du -h /var/lib/postgresql/data

# Payment database
docker exec opareta-payment-system-payment-db-1 du -h /var/lib/postgresql/data
```

### Check Connection Status

```bash
# Auth database
docker exec opareta-payment-system-auth-db-1 psql -U auth_user -d auth_service -c "SELECT version();"

# Payment database
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "SELECT version();"
```

### View Database Logs

```bash
# Auth database logs
docker logs opareta-payment-system-auth-db-1 --tail 50

# Payment database logs
docker logs opareta-payment-system-payment-db-1 --tail 50
```

---

## Backup & Recovery

### Backup Database

**Auth Database:**
```bash
docker exec opareta-payment-system-auth-db-1 pg_dump -U auth_user auth_service > backup_auth.sql
```

**Payment Database:**
```bash
docker exec opareta-payment-system-payment-db-1 pg_dump -U payment_user payment_service > backup_payment.sql
```

### Restore Database

**Auth Database:**
```bash
docker exec -i opareta-payment-system-auth-db-1 psql -U auth_user auth_service < backup_auth.sql
```

**Payment Database:**
```bash
docker exec -i opareta-payment-system-payment-db-1 psql -U payment_user payment_service < backup_payment.sql
```

---

## Troubleshooting

### Connection Refused

**Problem:** Cannot connect to database
```
psql: error: could not connect to server: Connection refused
```

**Solution:**
```bash
# Check if containers are running
docker ps | grep -E "auth-db|payment-db"

# Restart containers
docker restart opareta-payment-system-auth-db-1 opareta-payment-system-payment-db-1
```

### Unhealthy Status

**Problem:** Database container shows "unhealthy"
```bash
# Check logs
docker logs opareta-payment-system-payment-db-1

# Restart
docker restart opareta-payment-system-payment-db-1
```

### Table Not Found

**Problem:** Table doesn't exist after restart
```
ERROR: relation "payments" does not exist
```

**Solution:** Database initialization may have failed
```bash
# Check initialization logs
docker logs opareta-payment-system-payment-db-1 | grep -i init

# Recreate containers
docker-compose down
docker-compose up -d
```

### High Disk Usage

**Problem:** Database consuming too much space

**Solution:**
```bash
# Check table sizes
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Vacuum database
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "VACUUM ANALYZE;"
```

---

## Summary

✅ Both databases are running and accessible  
✅ Data persists in Docker named volumes  
✅ All tables created and initialized  
✅ API integration working correctly  
✅ Backups can be created anytime  

For any database issues, check the Docker logs first and verify containers are healthy.
