# Opareta Payment System

A microservices-based payment processing system built with NestJS, Docker, PostgreSQL, Redis, and Nginx.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [API Testing](#api-testing)
- [Database Operations](#database-operations)
- [Monitoring](#monitoring)
- [Development and Testing](#development-and-testing)
- [Backup and Restore](#backup-and-restore)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Features

### Authentication Service

- User registration with phone number, email, and password
- JWT token generation and validation
- Strong password validation
- Duplicate user prevention

### Payment Service

- Payment initiation with unique reference generation
- State management: `INITIATED → PENDING → SUCCESS/FAILED`
- Webhook and status update handling
- Idempotency support
- Audit logging for transaction changes
- Simulated payment provider integration

### Infrastructure

- Dockerized microservices
- Separate PostgreSQL databases
- Redis caching and session management
- Nginx API gateway
- Prometheus and Grafana monitoring

## Architecture

```text
┌──────────────┐       ┌──────────────┐       ┌───────────────┐
│  Client App  │──────►│    Nginx     │──────►│ Auth Service  │
│              │       │ Port: 8080   │       │  Port: 3001   │
└──────────────┘       └──────┬───────┘       └───────┬───────┘
                              │                       │
                              └───────────┐           │
                                          ▼           ▼
                                  ┌───────────────┐  ┌──────────┐
                                  │Payment Service│  │ Auth DB  │
                                  │  Port: 3002   │  │PostgreSQL│
                                  └───────┬───────┘  └──────────┘
                                          │
                                  ┌───────▼───────┐
                                  │  Payment DB   │
                                  │  PostgreSQL   │
                                  └───────┬───────┘
                                          │
                                  ┌───────▼───────┐
                                  │     Redis     │
                                  └───────────────┘
```

## Prerequisites

- Docker
- Docker Compose

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/erico19/opareta-payment-system.git
cd opareta-payment-system
```

### 2. Start all services

```bash
docker compose up -d --build
```

### 3. Verify the services

```bash
docker compose ps
```

Expected services:

- `auth-service` — port `3001`
- `payment-service` — port `3002`
- `nginx` — port `8080`
- PostgreSQL databases
- Redis
- Grafana — port `3000`
- Prometheus — port `9090`

### View logs

```bash
# All services
docker compose logs

# Follow all logs
docker compose logs -f

# Follow a specific service
docker compose logs -f auth-service
docker compose logs -f payment-service
docker compose logs -f nginx
```

### Stop the system

```bash
# Stop containers
docker compose down

# Stop containers and remove volumes
docker compose down -v
```

## API Documentation

- Auth Service Swagger UI: <http://localhost:3001/api>
- Payment Service Swagger UI: <http://localhost:3002/api>

### Authentication Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Log in and receive a JWT |
| `GET` | `/auth/validate` | Validate a token |
| `GET` | `/auth/health` | Auth service health check |

### Payment Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/payments` | Create a payment |
| `GET` | `/payments/{reference}` | Get a payment by reference |
| `PATCH` | `/payments/{reference}/status` | Update payment status |
| `GET` | `/payments/health` | Payment service health check |

## API Testing

### Register a user

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+256700000001",
    "password": "SecurePass123!",
    "email": "test@opareta.com"
  }'
```

Expected response:

```json
{
  "user": {
    "phone_number": "+256700000001",
    "email": "test@opareta.com",
    "id": "...",
    "is_active": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Log in

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+256700000001",
    "password": "SecurePass123!"
  }'
```

Use the returned JWT token for authenticated payment requests:

```bash
export JWT_TOKEN="YOUR_JWT_TOKEN"
```

### Test weak password validation

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+256700000002",
    "password": "password123",
    "email": "weak-password@opareta.com"
  }'
```

Expected status: `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": ["Password too weak. Include upper, lower, number and special char."],
  "error": "Bad Request"
}
```

### Test duplicate registration

Registering the same phone number or email again returns:

```json
{
  "statusCode": 409,
  "message": "User with this phone number or email already exists",
  "error": "Conflict"
}
```

### Create a payment

```bash
curl -X POST http://localhost:3002/payments \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "TEST_001",
    "amount": 1000,
    "currency": "UGX",
    "payment_method": "MOBILE_MONEY",
    "customer_phone": "+256700000001",
    "customer_email": "test@opareta.com"
  }'
```

Expected response:

```json
{
  "reference": "OP123456789ABC",
  "amount": 1000,
  "currency": "UGX",
  "status": "INITIATED",
  "provider_name": "simulated"
}
```

### Get payment status

```bash
curl -X GET http://localhost:3002/payments/OP123456789ABC \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Move a payment to pending

```bash
curl -X PATCH http://localhost:3002/payments/OP123456789ABC/status \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PENDING",
    "provider_transaction_id": "MTN_123456",
    "reason": "Payment processing started"
  }'
```

### Complete a payment

```bash
curl -X PATCH http://localhost:3002/payments/OP123456789ABC/status \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUCCESS",
    "provider_transaction_id": "MTN_123456",
    "reason": "Payment completed successfully"
  }'
```

### Test unauthorized access

```bash
curl -X POST http://localhost:3002/payments \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000}'
```

Expected status: `401 Unauthorized`

## State Transition Rules

Valid transitions:

- `INITIATED → PENDING`
- `PENDING → SUCCESS`
- `PENDING → FAILED`

Invalid transitions are rejected with `400 Bad Request`, including:

- `INITIATED → SUCCESS`
- `INITIATED → FAILED`
- `SUCCESS → SUCCESS`
- `FAILED → SUCCESS`

Example failure path:

```bash
# Move to pending
curl -X PATCH http://localhost:3002/payments/{reference}/status \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"PENDING","reason":"Moving to pending state"}'

# Mark as failed
curl -X PATCH http://localhost:3002/payments/{reference}/status \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"FAILED","reason":"Payment failed - insufficient funds"}'
```

## Database Operations

### Check payments

```bash
docker compose exec payment-db psql -U payment_user -d payment_service -c "SELECT reference, amount, status, created_at FROM payments ORDER BY created_at DESC LIMIT 5;"
```

### Check audit logs

```bash
docker compose exec payment-db psql -U payment_user -d payment_service -c "SELECT payment_reference, from_status, to_status, reason, created_at FROM payment_audit_log ORDER BY created_at DESC LIMIT 5;"
```

### Check users

```bash
docker compose exec auth-db psql -U auth_user -d auth_service -c "SELECT phone_number, email, created_at FROM users;"
```

## Monitoring

### Grafana

- URL: <http://localhost:3000>
- Username: `admin`
- Password: `admin`
- Includes service health, request metrics, and payment success rates

### Prometheus

- URL: <http://localhost:9090>
- Used for metrics collection and querying

## Development and Testing

```bash
# Auth service tests
docker compose exec auth-service npm test

# Payment service tests
docker compose exec payment-service npm test

# Tests with coverage
docker compose exec auth-service npm run test:cov
docker compose exec payment-service npm run test:cov
```

## Backup and Restore

### Automated backups

The system includes automated daily backups with 7-day retention.

#### Windows

```powershell
cd scripts\powershell

# Setup scheduled backup (run as Administrator)
.\setup-backup-task.ps1

# Manual backup
.\backup.ps1

# Restore
.\restore.ps1 "C:\opareta\backups\backup_20240115_020000.7z"
```

#### Linux or macOS

```bash
# Setup cron job
chmod +x scripts/linux/setup-cron.sh
./scripts/linux/setup-cron.sh

# Manual backup
./scripts/linux/backup.sh

# Restore
./scripts/linux/restore.sh /opt/opareta/backups/backup_20240115_020000.tar.gz
```

### Manual database backup

```bash
# Auth database
docker exec opareta-payment-system-auth-db-1 pg_dump -U auth_user auth_db > auth_backup.sql

# Payment database
docker exec opareta-payment-system-payment-db-1 pg_dump -U payment_user payment_db > payment_backup.sql
```

### Manual database restore

```bash
# Restore auth database
docker exec -i opareta-payment-system-auth-db-1 psql -U auth_user auth_db < auth_backup.sql

# Restore payment database
docker exec -i opareta-payment-system-payment-db-1 psql -U payment_user payment_db < payment_backup.sql
```

> Container names may differ based on the Compose project name. Run `docker compose ps` to confirm exact names.

## Security

- JWT-based authentication
- Strong password validation
- Input sanitization and validation
- SQL injection prevention
- Duplicate user prevention
- Secure payment state transitions

## Troubleshooting

### Port already in use

```bash
netstat -tulpn | grep :3001
sudo lsof -i -P -n | grep LISTEN
```

Change the conflicting port in `docker-compose.yml` or stop the process using it.

### Database connection issues

```bash
# Check database containers
docker compose ps | grep db

# Reset databases and rebuild
docker compose down -v
docker compose up -d --build
```

### JWT token issues

- Use the token returned by the login endpoint
- Check that the token has not expired
- Use the format `Authorization: Bearer <token>`

## Support

For support, contact <mafabierico19@gmail.com>.

- Review logs: `docker compose logs [service-name]`
- Verify running services: `docker compose ps`
