# Admin Guide - Opareta Payment System

## Overview

The admin side provides access to view all payments in the system, regardless of which user created them. This is essential for monitoring, auditing, and system administration.

---

## Admin Account Access

### Default Admin Account

**Email:** `admin@example.com`  
**Phone:** `+256700000346`  
**Password:** `AdminPass123456`

### How to Login as Admin

```powershell
# Via API
$loginBody = @{
    phone_number = "+256700000346"
    password = "AdminPass123456"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:8080/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody `
    -UseBasicParsing

$data = $response.Content | ConvertFrom-Json
$adminToken = $data.token

Write-Host "Logged in as: $($data.user.email)"
Write-Host "Token: $adminToken"
```

---

## Admin Endpoints

### 1. View All Payments (Admin Only)

**Endpoint:** `GET /payments/admin/all`  
**Authentication:** Required (Bearer token)  
**Access:** Admin users only

**Request:**
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:8080/payments/admin/all" `
    -Method GET `
    -Headers @{Authorization = "Bearer $adminToken"} `
    -UseBasicParsing

$payments = $response.Content | ConvertFrom-Json
$payments.payments | ForEach-Object {
    Write-Host "$($_.reference): $($_.amount) UGX from $($_.customer_email)"
}
```

**Response:**
```json
{
  "payments": [
    {
      "id": "uuid",
      "reference": "OP866066FJJ2YV",
      "amount": 5000.00,
      "currency": "UGX",
      "payment_method": "MOBILE_MONEY",
      "status": "SUCCESS",
      "customer_email": "user@example.com",
      "customer_phone": "+256700000001",
      "created_at": "2025-12-12T13:52:23.677Z"
    }
  ]
}
```

**Error Responses:**

- **403 Forbidden** - Non-admin user trying to access:
```json
{
  "statusCode": 403,
  "message": "Unauthorized - admin access required",
  "error": "Forbidden"
}
```

- **401 Unauthorized** - Invalid or missing token:
```json
{
  "statusCode": 401,
  "message": "Invalid token",
  "error": "Unauthorized"
}
```

---

## Admin User Management

### Current Admin Users

The following emails are whitelisted as admin accounts:

- `admin@example.com`
- `mafabierico@gmail.com`

### Adding More Admin Users

**Step 1:** Edit the payment controller file

**File:** `services/payment/src/payment/payment.controller.ts`

**Find this line (around line 62):**
```typescript
const adminEmails = ['admin@example.com', 'mafabierico@gmail.com'];
```

**Add your email to the list:**
```typescript
const adminEmails = ['admin@example.com', 'mafabierico@gmail.com', 'neoadmin@example.com'];
```

**Step 2:** Rebuild the payment service

```bash
cd services/payment
docker build -t opareta-payment-system-payment-service .
docker restart opareta-payment-system-payment-service-1
```

**Step 3:** Register the new admin with that email

```powershell
$adminBody = @{
    phone_number = "+256700000999"  # Any unique phone
    email = "neoadmin@example.com"
    password = "SecureAdminPass123"  # Min 8 characters
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:8080/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $adminBody `
    -UseBasicParsing
```

---

## Admin Features

### View All Payments Across Users

When logged in as admin, calling `/payments/history/all` shows **your own payments** (same as regular users).

To see **ALL payments in the system**, use the dedicated `/payments/admin/all` endpoint.

### Audit Trail

Check the database directly for audit information:

```bash
# Login to payment database
docker exec -it opareta-payment-system-payment-db-1 psql -U payment_user -d payment_service

# View all payments with status changes
SELECT p.reference, p.status, p.customer_email, p.created_at, a.reason, a.created_at as changed_at
FROM payments p
LEFT JOIN payment_audit_log a ON p.id = a.payment_id
ORDER BY p.created_at DESC;

# View webhook events (provider callbacks)
SELECT payment_reference, event_type, status, processed, created_at
FROM webhook_events
ORDER BY created_at DESC;
```

### Statistics

```bash
# Total payments by status
SELECT status, COUNT(*) as count FROM payments GROUP BY status;

# Total amount by user
SELECT customer_email, COUNT(*) as count, SUM(amount) as total
FROM payments
GROUP BY customer_email
ORDER BY total DESC;

# Revenue by currency
SELECT currency, SUM(amount) as total FROM payments GROUP BY currency;
```

---

## Fresh Build & Admin Account Behavior

### Question: Will It Always Create Admin?

**Short Answer:** NO - The admin account is NOT automatically created on fresh builds.

### What Happens on Fresh Build

1. **Database is fresh/empty** - No users exist initially
2. **Admin credentials hardcoded** - The email whitelist is hardcoded in the source code
3. **You must register the admin account** - Manually register `admin@example.com` (or any whitelisted email)

### Initial Setup for Fresh Deployment

**Step 1: Register Admin Account**
```powershell
$adminBody = @{
    phone_number = "+256700000346"
    email = "admin@example.com"
    password = "AdminPass123456"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8080/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $adminBody `
    -UseBasicParsing
```

**Step 2: Use Admin Token**
```powershell
# Login
$loginResp = Invoke-WebRequest -Uri "http://localhost:8080/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{phone_number = "+256700000346"; password = "AdminPass123456"} | ConvertTo-Json) `
    -UseBasicParsing

$token = ($loginResp.Content | ConvertFrom-Json).token

# Access admin endpoint
Invoke-WebRequest -Uri "http://localhost:8080/payments/admin/all" `
    -Method GET `
    -Headers @{Authorization = "Bearer $token"} `
    -UseBasicParsing
```

### Production Best Practices

For production deployment, consider:

1. **Seed initial admin account** - Create a database migration or initialization script
2. **Use environment variables** - Store admin emails in `.env` instead of hardcoding
3. **Implement role-based access control (RBAC)** - Store roles in database instead of hardcoded email list
4. **Use proper secrets management** - Store admin credentials in a secrets vault, not source code

### Example: Seeded Admin Account (Future Enhancement)

Instead of hardcoded emails, you could:

```typescript
// In auth.service.ts
async ensureAdminExists() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPhone = process.env.ADMIN_PHONE || '+256700000346';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123456';

  const existing = await this.usersRepository.findOne({
    where: { email: adminEmail }
  });

  if (!existing) {
    const password_hash = await bcrypt.hash(adminPassword, 10);
    const admin = this.usersRepository.create({
      phone_number: adminPhone,
      email: adminEmail,
      password_hash,
      is_admin: true  // New column
    });
    await this.usersRepository.save(admin);
  }
}
```

---

## Security Considerations

### ⚠️ Current Implementation Risks

1. **Hardcoded email whitelist** - Requires code change to add admins
2. **Simple password** - No complexity requirements beyond 8 characters
3. **No role column** - Admin status based only on email matching
4. **No audit logging** - No record of who accessed admin endpoints

### Recommendations

1. ✅ **Store admin list in database** - Use a `users.role` column (ADMIN, USER)
2. ✅ **Implement password policy** - Require strong passwords for admin accounts
3. ✅ **Add admin audit logging** - Log all admin actions
4. ✅ **Use 2FA for admin** - Require two-factor authentication
5. ✅ **Rotate admin credentials** - Regular password changes
6. ✅ **Limit admin endpoints** - Only expose what's necessary

---

## Troubleshooting

### Issue: Admin endpoint returns 403 Forbidden

**Cause:** Email not in admin whitelist

**Solution:** 
1. Check your email is in the `adminEmails` list in `payment.controller.ts`
2. Rebuild and restart the service
3. Verify you're logged in with the correct email

### Issue: Admin endpoint returns 401 Unauthorized

**Cause:** Invalid or expired token

**Solution:**
1. Login again to get a fresh token
2. Tokens expire after 1 hour
3. Make sure token is passed in `Authorization: Bearer <token>` header

### Issue: Can't login as admin

**Cause:** Account not registered

**Solution:**
1. Register the admin account first (email must be whitelisted)
2. Use exact credentials you registered with
3. Check phone number format: `+256...`

---

## Summary

| Feature | User | Admin |
|---------|------|-------|
| See own payments | ✅ | ✅ |
| See all payments | ❌ | ✅ (via `/payments/admin/all`) |
| Create payments | ✅ | ✅ |
| Edit payments | ❌ | ❌ (future) |
| Delete payments | ❌ | ❌ (future) |
| View audit logs | ❌ | ✅ (via database) |

**Admin Account (Fresh Start):**
- Email: `admin@example.com`
- Phone: `+256700000346`
- Password: `AdminPass123456`
- **Must be manually registered on fresh deployment**

---

## Next Steps

- [ ] Register admin account on deployment
- [ ] Test `/payments/admin/all` endpoint
- [ ] Monitor all payments and user activity
- [ ] Plan migration to database-based role management
- [ ] Implement audit logging for admin actions
