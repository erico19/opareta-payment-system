# Database Quick Reference - Opareta Payment System

## Quick Commands

### View All Users
```bash
docker exec opareta-payment-system-auth-db-1 psql -U auth_user -d auth_service -c "SELECT phone_number, email, created_at FROM users ORDER BY created_at DESC;"
```

### View All Payments
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "SELECT reference, amount, currency, status, created_at FROM payments ORDER BY created_at DESC;"
```

### View Payments by Status
```bash
# Successful payments
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "SELECT reference, amount, status FROM payments WHERE status = 'SUCCESS' ORDER BY created_at DESC;"

# Failed payments
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "SELECT reference, amount, status FROM payments WHERE status = 'FAILED' ORDER BY created_at DESC;"
```

### Payment Statistics
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "
SELECT 
    COUNT(*) as total_payments,
    COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successful,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
    SUM(CAST(amount AS DECIMAL)) as total_amount,
    AVG(CAST(amount AS DECIMAL)) as avg_amount
FROM payments;
"
```

### View Webhook Events
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "SELECT event_type, processed, created_at FROM webhook_events ORDER BY created_at DESC LIMIT 10;"
```

### View Audit Log for a Payment
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "
SELECT old_status, new_status, changed_by, created_at 
FROM payment_audit_log 
WHERE payment_id = (SELECT id FROM payments WHERE reference = 'OP...' LIMIT 1)
ORDER BY created_at;
"
```

### Check Total Users
```bash
docker exec opareta-payment-system-auth-db-1 psql -U auth_user -d auth_service -c "SELECT COUNT(*) as total_users FROM users;"
```

### Find User by Phone
```bash
docker exec opareta-payment-system-auth-db-1 psql -U auth_user -d auth_service -c "SELECT id, phone_number, email, is_active FROM users WHERE phone_number = '+256700000001';"
```

### Find Payments by Email
```bash
docker exec opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service -c "SELECT reference, amount, status FROM payments WHERE customer_email = 'user@example.com';"
```

---

## Connection Details

| Component | Host | Port | Database | User | Password |
|-----------|------|------|----------|------|----------|
| Auth DB | localhost | 5433 | auth_service | auth_user | auth_pass |
| Payment DB | localhost | 5434 | payment_service | payment_user | payment_pass |

---

## Testing Checklist

- [ ] Can connect to auth database (port 5433)
- [ ] Can connect to payment database (port 5434)
- [ ] Users table contains registered users
- [ ] Payments table contains payment records
- [ ] Webhook events are being recorded
- [ ] Audit logs track payment status changes
- [ ] Database volumes are persisting data
- [ ] Backups can be created successfully

---

## PowerShell Commands for Testing

### Test Auth Registration
```powershell
$body = @{phone_number="+256700000001"; email="test@example.com"; password="TestPass123"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:8080/auth/register" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
```

### Test Auth Login
```powershell
$body = @{phone_number="+256700000001"; password="TestPass123"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:8080/auth/login" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
```

### Test Payment Creation
```powershell
$token = "YOUR_TOKEN_HERE"
$body = @{amount=1000; currency="UGX"; payment_method="MOBILE_MONEY"; customer_phone="+256700000001"; customer_email="test@example.com"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:8080/payments" -Method POST -ContentType "application/json" -Body $body -Headers @{Authorization="Bearer $token"} -UseBasicParsing
```

### Test Payment History
```powershell
$token = "YOUR_TOKEN_HERE"
Invoke-WebRequest -Uri "http://localhost:8080/payments/history/all" -Method GET -Headers @{Authorization="Bearer $token"} -UseBasicParsing
```

---

## GUI Access (DBeaver)

1. Download DBeaver: https://dbeaver.io/download/
2. File → New Database Connection → PostgreSQL
3. Add both databases using connection details above
4. Browse tables, run queries, view data visually

---

## Backup Commands

### Backup Both Databases
```bash
# Auth backup
docker exec opareta-payment-system-auth-db-1 pg_dump -U auth_user auth_service > backup_auth.sql

# Payment backup
docker exec opareta-payment-system-payment-db-1 pg_dump -U payment_user payment_service > backup_payment.sql
```

### Restore Both Databases
```bash
# Auth restore
docker exec -i opareta-payment-system-auth-db-1 psql -U auth_user auth_service < backup_auth.sql

# Payment restore
docker exec -i opareta-payment-system-payment-db-1 psql -U payment_user payment_service < backup_payment.sql
```
