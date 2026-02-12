# Database Integration Testing Guide

## Overview

This guide covers how to test the Opareta Payment System's database integration through both API calls and direct database queries.

---

## Quick Access to Databases

### Option 1: Using DBeaver (GUI - Easiest)

1. **Download DBeaver Community Edition** (free from https://dbeaver.io/)
2. **Create new connection → PostgreSQL**

**For Auth DB:**
- Host: `localhost`
- Port: `5433`
- Database: `auth_service`
- User: `auth_user`
- Password: `auth_pass`

**For Payment DB:**
- Host: `localhost`
- Port: `5434`
- Database: `payment_service`
- User: `payment_user`
- Password: `payment_pass`

### Option 2: Using psql (Command Line)

**Auth Database:**
```bash
docker exec -it opareta-payment-system-auth-db-1 psql -U auth_user -d auth_service
```

**Payment Database:**
```bash
docker exec -it opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service
```

Once connected, you can run SQL queries directly in the terminal.

---

## End-to-End Test Workflow

### Step 1: Verify Databases are Running

```bash
# Check auth database
docker exec opareta-payment-system-auth-db-1 pg_isready -U auth_user -d auth_service

# Check payment database
docker exec opareta-payment-system-payment-db-1 pg_isready -U payment_user -d payment_service
```

Expected: `accepting connections`

---

### Step 2: Register a New User

**API Call:**
```powershell
$testEmail = "integration-test-$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
$testPhone = "+256700000$([Random]::new().Next(100,999))"

$body = @{
    phone_number = $testPhone
    email = $testEmail
    password = "TestPass123"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:8080/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing

$user = $response.Content | ConvertFrom-Json
Write-Host "Registered user: $testPhone - $testEmail"
Write-Host "User ID: $($user.user.id)"
```

**Database Verification:**
```bash
docker exec opareta-payment-system-auth-db-1 psql -U auth_user -d auth_service -c "
SELECT id, phone_number, email, is_active, created_at 
FROM users 
WHERE phone_number = '$testPhone';"
```

**Expected Result:** User should be in the database with `is_active = true`

---

### Step 3: Login User and Get Token

**API Call:**
```powershell
$loginBody = @{
    phone_number = $testPhone
    password = "TestPass123"
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri "http://localhost:8080/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody `
    -UseBasicParsing

$loginData = $loginResponse.Content | ConvertFrom-Json
$token = $loginData.token

Write-Host "Login successful"
Write-Host "Token: $($token.Substring(0, 20))..."
```

**Database Verification:**
```bash
docker exec opareta-payment-system-auth-db-1 psql -U auth_user -d auth_service -c "
SELECT user_id, expires_at, created_at 
FROM user_sessions 
WHERE token LIKE '%$((echo $token | tail -c 20))%'
ORDER BY created_at DESC LIMIT 1;"
```

**Expected Result:** New session should be in the database with future `expires_at` timestamp

---

### Step 4: Create a Payment

**API Call:**
```powershell
$paymentBody = @{
    amount = 5000
    currency = "UGX"
    payment_method = "MOBILE_MONEY"
    customer_phone = $testPhone
    customer_email = $testEmail
} | ConvertTo-Json

$paymentResponse = Invoke-WebRequest -Uri "http://localhost:8080/payments" `
    -Method POST `
    -ContentType "application/json" `
    -Body $paymentBody `
    -Headers @{Authorization = "Bearer $token"} `
    -UseBasicParsing

$payment = $paymentResponse.Content | ConvertFrom-Json
$paymentRef = $payment.reference

Write-Host "Payment created"
Write-Host "Reference: $paymentRef"
Write-Host "Amount: $($payment.amount) $($payment.currency)"
Write-Host "Status: $($payment.status)"
```

**Database Verification:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "
SELECT id, reference, amount, currency, payment_method, status, created_at 
FROM payments 
WHERE reference = '$paymentRef';"
```

**Expected Result:** Payment should be in database with status `INITIATED`

---

### Step 5: Retrieve Payment Details

**API Call:**
```powershell
$getResponse = Invoke-WebRequest -Uri "http://localhost:8080/payments/$paymentRef" `
    -Method GET `
    -Headers @{Authorization = "Bearer $token"} `
    -UseBasicParsing

$paymentDetails = $getResponse.Content | ConvertFrom-Json
Write-Host "Retrieved payment:"
Write-Host "Reference: $($paymentDetails.reference)"
Write-Host "Status: $($paymentDetails.status)"
Write-Host "Amount: $($paymentDetails.amount)"
```

**Database Verification:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "
SELECT reference, amount, status, customer_email, created_at 
FROM payments 
WHERE reference = '$paymentRef';"
```

**Expected Result:** All payment details should match between API and database

---

### Step 6: Update Payment Status

**API Call:**
```powershell
$updateBody = @{
    status = "SUCCESS"
    reason = "Integration test payment completed"
} | ConvertTo-Json

$updateResponse = Invoke-WebRequest -Uri "http://localhost:8080/payments/$paymentRef/status" `
    -Method PATCH `
    -ContentType "application/json" `
    -Body $updateBody `
    -Headers @{Authorization = "Bearer $token"} `
    -UseBasicParsing

$updatedPayment = $updateResponse.Content | ConvertFrom-Json
Write-Host "Payment status updated to: $($updatedPayment.status)"
```

**Database Verification - Payment Table:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "
SELECT reference, status, updated_at 
FROM payments 
WHERE reference = '$paymentRef';"
```

**Database Verification - Audit Log:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "
SELECT old_status, new_status, changed_by, reason, created_at 
FROM payment_audit_log 
WHERE payment_id = (SELECT id FROM payments WHERE reference = '$paymentRef') 
ORDER BY created_at;"
```

**Expected Results:** 
- Payment status in `payments` table should be `SUCCESS`
- `payment_audit_log` should have entry showing transition from `INITIATED` to `SUCCESS`

---

### Step 7: Retrieve Payment History

**API Call:**
```powershell
$historyResponse = Invoke-WebRequest -Uri "http://localhost:8080/payments/history/all" `
    -Method GET `
    -Headers @{Authorization = "Bearer $token"} `
    -UseBasicParsing

$history = $historyResponse.Content | ConvertFrom-Json
Write-Host "Payment history:"
$history.payments | ForEach-Object {
    Write-Host "- $($_.reference): $($_.amount) $($_.currency) ($($_.status))"
}
```

**Database Verification:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "
SELECT COUNT(*) as total_payments 
FROM payments 
WHERE customer_email = '$testEmail';"
```

**Expected Result:** Count should match the number of payments returned in API response

---

### Step 8: Simulate Webhook Event

**API Call:**
```powershell
$webhookBody = @{
    payment_reference = $paymentRef
    event_type = "payment.completed"
    status = "SUCCESS"
    provider_transaction_id = "PROV-$(Get-Random)"
    timestamp = (Get-Date).ToUniversalTime().ToString("O")
    idempotency_key = "test-$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json

$webhookResponse = Invoke-WebRequest -Uri "http://localhost:8080/webhooks/simulate" `
    -Method POST `
    -ContentType "application/json" `
    -Body $webhookBody `
    -Headers @{Authorization = "Bearer $token"} `
    -UseBasicParsing

Write-Host "Webhook simulated"
```

**Database Verification:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "
SELECT event_type, processed, created_at 
FROM webhook_events 
WHERE payment_id = (SELECT id FROM payments WHERE reference = '$paymentRef') 
ORDER BY created_at DESC LIMIT 1;"
```

**Expected Result:** New webhook event should be in database with `processed = true` or `false` depending on configuration

---

## Data Integrity Tests

### Test 1: Foreign Key Relationships

**Verify payments reference existing customers:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "
-- This should return no rows if all FKs are valid
SELECT COUNT(*) FROM payments 
WHERE customer_email NOT IN (SELECT email FROM auth_service.users);"
```

**Expected:** Result should be 0 (no orphaned records)

### Test 2: Data Consistency

**Verify no duplicate payment references:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "
SELECT reference, COUNT(*) as count 
FROM payments 
GROUP BY reference 
HAVING COUNT(*) > 1;"
```

**Expected:** No results (all references are unique)

### Test 3: Status Transitions

**Verify valid status transitions:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "
SELECT DISTINCT status FROM payments ORDER BY status;"
```

**Expected:** Only valid statuses: `INITIATED`, `PENDING`, `SUCCESS`, `FAILED`

---

## Performance Tests

### Test 1: Query Performance - Count Payments

```bash
time docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "SELECT COUNT(*) FROM payments;"
```

**Expected:** Should complete in < 100ms

### Test 2: Query Performance - List Payments with Sorting

```bash
time docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "SELECT * FROM payments ORDER BY created_at DESC LIMIT 100;"
```

**Expected:** Should complete in < 500ms

### Test 3: Insert Performance

```powershell
# Insert 10 test payments and measure time
Measure-Command {
    for ($i = 1; $i -le 10; $i++) {
        $paymentBody = @{
            amount = 1000 + $i
            currency = "UGX"
            payment_method = "MOBILE_MONEY"
            customer_phone = $testPhone
            customer_email = $testEmail
        } | ConvertTo-Json
        
        Invoke-WebRequest -Uri "http://localhost:8080/payments" `
            -Method POST `
            -ContentType "application/json" `
            -Body $paymentBody `
            -Headers @{Authorization = "Bearer $token"} `
            -UseBasicParsing | Out-Null
    }
}
```

**Expected:** 10 payments should insert in < 5 seconds

---

## Cleanup

### Delete Test Data

**Delete test user:**
```bash
docker exec opareta-payment-system-auth-db-1 psql -U auth_user -d auth_service -c "DELETE FROM users WHERE phone_number = '$testPhone';"
```

**Delete test payments:**
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "DELETE FROM payments WHERE customer_email = '$testEmail';"
```

---

## Troubleshooting

### Database Connection Issues

**Symptom:** `psql: error: could not connect to server`

**Solution:**
```bash
# Check container status
docker ps | grep -E "auth-db|payment-db"

# Check logs
docker logs opareta-payment-system-payment-db-1

# Restart if needed
docker restart opareta-payment-system-payment-db-1
```

### Data Not Appearing

**Symptom:** Payment created via API but not in database

**Solution:**
```bash
# Check database logs
docker logs opareta-payment-system-payment-db-1

# Verify table exists
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "\dt"

# Check for errors in application logs
docker logs opareta-payment-system-payment-service-1 | grep -i error
```

### Permission Denied

**Symptom:** `permission denied for schema public`

**Solution:**
```bash
# This shouldn't happen with default setup, but if it does:
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "GRANT ALL PRIVILEGES ON SCHEMA public TO payment_user;"
```

### Existing Users Can't Login or Create Payments

**Symptom:** Old/existing user accounts show "Invalid token" or "No payments yet" even after logging in

**Cause:** Old sessions in the database are invalid or expired, blocking fresh logins

**Solution:**
```bash
# Clear all old sessions to allow fresh logins
docker exec opareta-payment-system-auth-db-1 psql -U auth_user -d auth_service -c "DELETE FROM user_sessions;"
```

**Steps to test after fix:**
1. Clear browser localStorage (F12 → Storage → Clear site data)
2. Logout from the application
3. Refresh the page (F5)
4. Login again with any existing user
5. Try creating a payment - should work now ✅

**Note:** This clears ALL user sessions. Users will need to login again after running this command.

---

## Summary Checklist

- [ ] Both databases are running and accepting connections
- [ ] User registration creates records in auth database
- [ ] User sessions are recorded in user_sessions table
- [ ] Payments are created with INITIATED status
- [ ] Payment status updates are tracked in audit logs
- [ ] Webhook events are recorded
- [ ] Payment history retrieval works correctly
- [ ] All API responses match database state
- [ ] Foreign key relationships are maintained
- [ ] No duplicate data exists
- [ ] Performance meets expectations

All tests passing = System ready for production! ✅
