
  # Opareta Payment System

A complete payment processing system with authentication and payment services, built with NestJS, Docker, and PostgreSQL.

## Architecture

- **Auth Service**: User authentication and JWT token management
- **Payment Service**: Payment processing with state management and webhook handling
- **PostgreSQL**: Separate databases for each service
- **Redis**: Caching and session management
- **Nginx**: Reverse proxy with load balancing
- **Prometheus & Grafana**: Monitoring and alerting

## Quick Start

   🚀 **Opareta Payment System**
A complete microservices-based payment processing system built with NestJS, Docker, and PostgreSQL.

📋 **Table of Contents** 
Features
Architecture
Quick Start
API Documentation
Testing
Monitoring
Development

✨ **Features**

🔐 **Authentication Service**
User registration with phone, email, and password
JWT token generation and validation
Strong password validation
Duplicate user prevention

💳 **Payment Service**
Payment initiation with unique reference generation
Complete state management (INITIATED → PENDING → SUCCESS/FAILED)
Webhook handling with idempotency
Audit logging for all transactions
Provider integration simulation

🏗️ **Infrastructure**
-Dockerized microservices
-Separate PostgreSQL databases
-Redis caching and session management
-Nginx API gateway
-Prometheus + Grafana monitoring

🏛️ **Architecture diagram**



┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │ ── │  Nginx Gateway   │ ── │  Auth Service   │
│                 │    │    (Port 8080)   │    │   (Port 3001)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                       │
                              │ ┌─────────────────┐   │
                              └─│ Payment Service │   │
                                │   (Port 3002)   │   │
                                └─────────────────┘   │
                                      │               │
                ┌──────────────┐      │     ┌──────────────┐
                │ Payment DB   │◄─────┘     │   Auth DB    │
                │  (PostgreSQL)│            │  (PostgreSQL)│
                └──────────────┘            └──────────────┘
                                      │
                                ┌─────────┐
                                │  Redis  │
                                └─────────┘





🚀 **Quick Start**

Prerequisites
Docker
Docker Compose

1. **Clone and Setup**
bash
git clone <repository-url>
cd opareta-payment-system
2. **Start All Services**
bash
docker-compose up -d --build
3. **Verify Services**
bash
docker-compose ps

**Check Service Logs:**
bash
## View all services logs
docker-compose logs
docker-compose logs -f
## View specific service logs
docker-compose logs auth-service
docker-compose logs payment-service
docker-compose logs nginx
## Follow logs in real-time
docker-compose logs -f auth-service
## Stop all services
docker-compose down
## Stop and remove volumes
docker-compose down -v

**All services should show as "Up":**

✅ auth-service (Port 3001)

✅ payment-service (Port 3002)

✅ nginx (Port 8080)

✅ PostgreSQL databases

✅ Redis

✅ Grafana (Port 3000)

✅ Prometheus (Port 9090)

🔧 **API Testing**

1. **User Registration & Security Tests**
bash
**Register a new user (strong password required)**
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+256700000001",
    "password": "SecurePass123!",
    "email": "test@opareta.com"
  }
  '

**Expected Response** 

json
{
  "user": {
    "phone_number": "+256700000001",
    "email": "test@opareta.com",
    "id": "...",
    "is_active": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
2. **User Login**
bash
**Login to get JWT**
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+256700000001",
    "password": "SecurePass123!"
  }'

**❌ Password Validation (Security Feature)**
  curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+256700000001",
    "password": "password123",
    "email": "test@opareta.com"
  }'

  **❌ Response:**

json
{
  "statusCode": 400,
  "message": ["Password too weak. Include upper, lower, number and special char."],
  "error": "Bad Request"
}

**❌ Duplicate Prevention (Security Feature)**
bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+256700000001",
    "password": "SecurePass123!",
    "email": "test@opareta.com"
  }'
**❌ Response:**

json
{
  "statusCode": 409,
  "message": "User with this phone number or email already exists",
  "error": "Conflict"
}

3. **Create Payment**
bash
**Create a new payment (replace TOKEN with actual JWT)**
curl -X POST http://localhost:3002/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "reference": "TEST_001",
    "amount": 1000,
    "currency": "UGX",
    "payment_method": "MOBILE_MONEY",
    "customer_phone": "+256700000001",
    "customer_email": "test@opareta.com"
  }'

**Expected Response:**

json
{
  "reference": "OP123456789ABC",
  "amount": 1000,
  "currency": "UGX",
  "status": "INITIATED",
  "provider_name": "simulated"
}
4. **Get Payment Status**
bash
**Get payment by reference**
curl -X GET http://localhost:3002/payments/OP123456789ABC \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

  **Response:**

json
{
  "id": "601c31a5-86e6-4c93-b65f-085183946f63",
  "reference": "OP123456789ABC",
  "amount": "2500.00",
  "currency": "UGX",
  "payment_method": "MOBILE_MONEY",
  "customer_phone": "+256700000001",
  "customer_email": "test@opareta.com",
  "status": "SUCCESS",
  "provider_transaction_id": "PROV1764332700508",
  "provider_name": "simulated",
  "created_at": "2025-11-28T12:24:48.131Z",
  "updated_at": "2025-11-28T12:25:00.554Z"
}

5. **Update Payment Status (Webhook Simulation)**
bash
**Move payment to PENDING state(# Replace OP123456789 with actual reference from Step 2)**
curl -X PATCH http://localhost:3002/payments/OP123456789ABC/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PENDING",
    "provider_transaction_id": "MTN_123456",
    "reason": "Payment processing started"
  }'

**Complete payment (SUCCESS)-(Update Status to SUCCESS)**
curl -X PATCH http://localhost:3002/payments/OP123456789ABC/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUCCESS",
    "provider_transaction_id": "MTN_123456",
    "reason": "Payment completed successfully"
  }'

bash
**Test password validation**
curl -X POST /auth/register -d '{"password": "weak"}'
**Expected: 400 - Password too weak**

**Test duplicate registration**
curl -X POST /auth/register -d '{"phone_number": "+256700000001", ...}'
**Expected: 409 - User already exists**

**Test unauthorized access**
curl -X POST /payments -H "Authorization: Bearer invalid_token" ...
 Expected: 401 - Unauthorized

📊 **Database Operations**
**Check Payments**
bash
docker-compose exec payment-db psql -U payment_user -d payment_service -c "
SELECT reference, amount, status, created_at 
FROM payments 
ORDER BY created_at DESC 
LIMIT 5;"
**Check Audit Logs**
bash
docker-compose exec payment-db psql -U payment_user -d payment_service -c "
SELECT payment_reference, from_status, to_status, reason, created_at 
FROM payment_audit_log 
ORDER BY created_at DESC 
LIMIT 5;"

**📊 Database Verification Commands**
🧪 **Test Scenarios** 
Valid State Transitions
bash
**Happy Path: INITIATED → PENDING → SUCCESS**
curl -X PATCH /payments/{reference}/status -d '{"status": "PENDING", ...}'
curl -X PATCH /payments/{reference}/status -d '{"status": "SUCCESS", ...}'
**Failure Path: INITIATED → PENDING → FAILED**  
curl -X PATCH /payments/{reference}/status -d '{"status": "PENDING", ...}'
curl -X PATCH /payments/{reference}/status -d '{"status": "FAILED", ...}'
Invalid State Transitions (Should Fail)
bash
**These will return 400 errors (as expected)**
curl -X PATCH /payments/{reference}/status -d '{"status": "SUCCESS", ...}' # From INITIATED
curl -X PATCH /payments/{reference}/status -d '{"status": "FAILED", ...}'  # From INITIATED
curl -X PATCH /payments/{reference}/status -d '{"status": "SUCCESS", ...}' # From SUCCESS
Security Tests

**Check All Payments and (Test Scenarios From My Examples for Valid State Transitions )**
bash
docker-compose exec payment-db psql -U payment_user -d payment_service -c "SELECT reference, amount, status FROM payments ORDER BY created_at DESC LIMIT 5;"
✅ Output:

text
   reference    | amount  |  status
----------------+---------+-----------
 OP321460TOHXRH | 1000.00 | INITIATED
 OP829969IWMQLQ | 1000.00 | SUCCESS
 OP959679CFV8YM | 1000.00 | FAILED
 OP607806VOCO2A | 1000.00 | SUCCESS
 OP688119JJNFT0 | 2500.00 | SUCCESS
(5 rows)

**Check Audit Logs**
bash
docker-compose exec payment-db psql -U payment_user -d payment_service -c "SELECT payment_reference, from_status, to_status, reason, created_at FROM payment_audit_log ORDER BY created_at DESC LIMIT 5;"
✅ Output:

text
 payment_reference | from_status | to_status |                reason                |          created_at
-------------------+-------------+-----------+---------------------------------------+-------------------------------
 OP959679CFV8YM    | PENDING     | FAILED    | Payment failed - insufficient funds   | 2025-11-28 13:02:36.615314+00
 OP959679CFV8YM    | INITIATED   | PENDING   | Moving to pending state               | 2025-11-28 13:02:16.139145+00
 OP829969IWMQLQ    | PENDING     | SUCCESS   | Payment confirmed and completed       | 2025-11-28 12:58:43.456799+00
(3 rows)

**❌ Invalid State Transitions (Security Features)**

**Invalid: INITIATED → SUCCESS (Direct)**
bash
curl -X PATCH http://localhost:3002/payments/OP445675S1KJPS/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUCCESS",
    "provider_transaction_id": "MTN_111222333",
    "reason": "Payment completed successfully"
  }'
**❌ Response:**

json
{
  "statusCode": 400,
  "message": "Invalid state transition from INITIATED to SUCCESS",
  "error": "Bad Request"
}

**Invalid: INITIATED → FAILED (Direct)**
bash
curl -X PATCH http://localhost:3002/payments/OP321460TOHXRH/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "FAILED",
    "provider_transaction_id": "MTN_000000",
    "reason": "Transaction timeout"
  }'
**❌ Response:**

json
{
  "statusCode": 400,
  "message": "Invalid state transition from INITIATED to FAILED",
  "error": "Bad Request"
}
**Invalid: SUCCESS → SUCCESS (Duplicate)**
bash
curl -X PATCH http://localhost:3002/payments/OP607806VOCO2A/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUCCESS",
    "provider_transaction_id": "MTN_123456789",
    "reason": "Payment completed successfully"
  }'
**❌ Response:**

json
{
  "statusCode": 400,
  "message": "Invalid state transition from SUCCESS to SUCCESS",
  "error": "Bad Request"
}

**Check Users**
bash
docker-compose exec auth-db psql -U auth_user -d auth_service -c "
SELECT phone_number, email, created_at 
FROM users;"

📖 **API Documentation**
**Swagger UI**
Auth Service: http://localhost:3001/api
Payment Service: http://localhost:3002/api

**Available Endpoints**

**Authentication Service**
POST /auth/register - Register new user
POST /auth/login - User login
GET /auth/validate - Validate token
GET /auth/health - Health check
**Payment Service**
POST /payments - Create payment
GET /payments/{reference} - Get payment by reference
PATCH /payments/{reference}/status - Update payment status
GET /payments/health - Health check

📈 **Monitoring**

**Grafana Dashboard**
URL: http://localhost:3000
Credentials: admin/admin
Features: Service health, request metrics, payment success rates

**Prometheus**
URL: http://localhost:9090
Features: Metrics collection and querying

**🛠️ Run Development Tests**

**Run tests for auth service**
docker-compose exec auth-service npm test
**Run tests for payment service**  
docker-compose exec payment-service npm test
**Run tests with coverage**
docker-compose exec auth-service npm run test:cov
docker-compose exec payment-service npm run test:cov

🔒 **Security Features**
JWT-based authentication
Strong password validation
Input sanitization and validation
SQL injection prevention
Duplicate user prevention
Secure state transitions

🐛 **Troubleshooting(Common Issues)**

# Port already in use
-Change ports in docker-compose.yml or stop conflicting services
# Short version
netstat -tulpn
# Detailed version
sudo netstat -tulpn
# Alternative with lsof
sudo lsof -i -P -n | grep LISTEN
# Check what's using the port
netstat -tulpn | grep :3001
Or change ports in docker-compose.yml

  
  **Database connection issues**

**Check if databases are running**
docker-compose ps | grep db
**Reset databases**
docker-compose down -v && docker-compose up -d --build
**JWT token issues**
Ensure you're using the correct token from login response
Check token expiration
Verify Authorization header format: Bearer <token>

## 🔄 Backup & Restore

### Automated Backups
The system includes automated daily backups with 7-day retention.

#### Windows:
```powershell
# Run setup (as Administrator)
cd scripts\powershell
.\setup-backup-task.ps1

# Manual backup
.\backup.ps1

# Restore
.\restore.ps1 "C:\opareta\backups\backup_20240115_020000.7z"

# Linux/Mac:
# Setup cron job
chmod +x scripts/linux/setup-cron.sh
./scripts/linux/setup-cron.sh

# Manual backup
./scripts/linux/backup.sh

# Restore
./scripts/linux/restore.sh /opt/opareta/backups/backup_20240115_020000.tar.gz

# Manual Backup
# Backup auth database
docker exec opareta-payment-system_auth-db_1 pg_dump -U auth_user auth_db > auth_backup.sql

# Backup payment database
docker exec opareta-payment-system_payment-db_1 pg_dump -U payment_user payment_db > payment_backup.sql

## Restore
bash
# Restore auth database
docker exec -i opareta-payment-system_auth-db_1 psql -U auth_user auth_db < auth_backup.sql

# Restore payment database
docker exec -i opareta-payment-system_payment-db_1 psql -U payment_user payment_db < payment_backup.sql
📞 **Support**
For issues and questions:(mafabierico19@gmail.com)
Check the troubleshooting section above
Review service logs: docker-compose logs [service-name]
Verify all services are running: docker-compose ps

