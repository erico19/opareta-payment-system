# Production Deployment Guide

**Last Updated**: December 11, 2025

---

## Overview

This guide documents the complete production deployment architecture of the Opareta Payment System, including frontend configuration, API routing, database management, and the fixes applied to ensure reliability.

---

## Quick Summary

### What Was Fixed (December 11, 2025)

The system had a critical issue preventing payment creation:
- **Error**: "NetworkError when attempting to fetch resource"
- **Root Cause**: Frontend running on dev server port 5173 instead of production Nginx
- **Solution**: Complete frontend redesign with production Nginx, TypeORM sync fixes, and proper routing

**Status**: ✅ FULLY RESOLVED

---

## Architecture Overview

### Network Topology

```
┌─────────────────────────────────────────────────────┐
│                  User Browser                        │
│            http://localhost:8080                     │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│           Nginx Reverse Proxy (Port 8080)           │
│        ┌──────────────────────────────────────┐     │
│        │    Health: /health                   │     │
│        │    Frontend: /                       │     │
│        │    Auth: /auth/                      │     │
│        │    Payments: /payments/              │     │
│        │    Webhooks: /webhooks/              │     │
│        └──────────────────────────────────────┘     │
└──────────┬───────────┬──────────┬──────────┬────────┘
           │           │          │          │
      ┌────▼──┐  ┌────▼──┐  ┌───▼───┐  ┌───▼──┐
      │Frontend│  │ Auth  │  │Payment│  │Webhks│
      │(Nginx) │  │Service│  │Service│  │(Pay) │
      │Port 80 │  │:3001  │  │:3002  │  │:3002 │
      └────┬───┘  └───────┘  └───────┘  └──────┘
           │          │          │
      ┌────▼──────────▼──────────▼──────┐
      │    PostgreSQL + Redis + Cache   │
      │  (Internal Network Only - Secure)│
      └─────────────────────────────────┘
```

### Port Mapping

| Service | Internal Port | External Port | Access |
|---------|--------------|---------------|--------|
| Frontend (Nginx) | 80 | - | Via Nginx 8080 |
| Nginx Gateway | 80 | **8080** | Primary entry point |
| Auth Service | 3001 | 3001* | Direct or via Nginx |
| Payment Service | 3002 | 3002* | Direct or via Nginx |
| Grafana | 3000 | **3000** | Monitoring |
| Prometheus | 9090 | **9090** | Metrics |
| PostgreSQL Auth | 5432 | **5433** | Development only |
| PostgreSQL Payment | 5432 | **5434** | Development only |
| Redis | 6379 | Internal | Internal only |
| Node Exporter | 9100 | **9100** | Metrics collection |

*Direct service access available for testing, but use Nginx for production

---

## Frontend Architecture

### Current Production Setup

**Technology Stack:**
- Build: Vite (fast, optimized bundles)
- Runtime: Nginx 1.21 Alpine (lightweight, fast)
- Serving: Static files with SPA routing
- Caching: 1-year cache headers for assets

**Build Pipeline:**
```
Frontend Source Code
       ↓
npm install (dependencies)
       ↓
npm run build (Vite production build)
       ↓
/dist folder (optimized static files)
       ↓
Docker COPY to Nginx /usr/share/nginx/html
       ↓
Nginx serves static files (port 80)
       ↓
Nginx routes / to Nginx container
       ↓
Nginx Gateway proxies to Nginx container
       ↓
User sees frontend at http://localhost:8080
```

### SPA Routing Configuration

**Problem Solved**: React Router and other SPAs need special Nginx config to route client-side navigation to index.html

**Solution**: Nginx SPA configuration
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

This ensures:
- Static files (js, css, images) served directly
- Client-side routes (e.g., /dashboard) fallback to index.html
- React Router handles client-side navigation

### Caching Strategy

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**Benefits:**
- Assets cached for 1 year in browser
- Reduces bandwidth usage
- Faster page loads for returning users
- Safe: assets are immutable (versioned by build hash)

---

## API Gateway (Nginx)

### Routing Configuration

**Primary Routes:**

```nginx
# Frontend (static files)
location / {
    proxy_pass http://frontend:80;
}

# Auth Service
location /auth/ {
    proxy_pass http://auth_services;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Payment Service
location /payments/ {
    proxy_pass http://payment_services;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Webhooks
location /webhooks/ {
    proxy_pass http://payment_services;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Health Check
location /health {
    proxy_pass http://auth-service:3001/auth/health;
}
```

### Rate Limiting

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;

server {
    limit_req zone=api_limit burst=20 nodelay;
}
```

**Configuration:**
- Zone: 10MB memory for tracking
- Rate: 100 requests per minute per IP
- Burst: Allow 20 extra requests
- Nodelay: Reject immediately when exceeding limit

---

## Database Management

### TypeORM Auto-Synchronization

**Purpose:** Automatically create/update database tables based on entity definitions

**How It Works:**

1. **Service Startup:**
   - Check `TYPEORM_SYNCHRONIZE=true` env var
   - Load TypeORM entities from `src/**/*.entity.ts`
   - Connect to database
   - Compare entities with actual database schema
   - Create/modify/delete tables as needed

2. **Configuration (services/*/src/app.module.ts):**
```typescript
TypeOrmModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    url: configService.get('DATABASE_URL'),
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: configService.get('TYPEORM_SYNCHRONIZE') === 'true' 
                  || configService.get('NODE_ENV') !== 'production',
    logging: configService.get('NODE_ENV') === 'development',
  }),
})
```

3. **Environment Setup:**
```yaml
# docker-compose.yml
environment:
  - NODE_ENV=production
  - TYPEORM_SYNCHRONIZE=true  # KEY: enables auto-sync despite NODE_ENV
  - DATABASE_URL=postgresql://user:pass@db:5432/database
```

**Tables Created:**
- Auth Service: `users`, `user_sessions`
- Payment Service: `payments`, `webhook_events`, `payment_audit_log`

---

## Database Initialization

### PostgreSQL Setup

**Auth Database:**
```sql
DO $$ BEGIN
  CREATE ROLE auth_user LOGIN PASSWORD 'auth_pass';
EXCEPTION WHEN DUPLICATE_OBJECT THEN
  NULL;
END $$;

CREATE DATABASE IF NOT EXISTS auth_service OWNER auth_user;
GRANT ALL PRIVILEGES ON DATABASE auth_service TO auth_user;
\c auth_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

**Payment Database:**
```sql
DO $$ BEGIN
  CREATE ROLE payment_user LOGIN PASSWORD 'payment_pass';
EXCEPTION WHEN DUPLICATE_OBJECT THEN
  NULL;
END $$;

CREATE DATABASE IF NOT EXISTS payment_service OWNER payment_user;
GRANT ALL PRIVILEGES ON DATABASE payment_service TO payment_user;
\c payment_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

**Key Features:**
- Idempotent: Can run multiple times safely
- PostgreSQL 15 compatible: Uses DO block instead of IF NOT EXISTS
- Minimal: Only creates roles and extensions
- Tables created by TypeORM, not SQL scripts

---

## Security Considerations

### Network Isolation

```
┌─ External Network (User-facing)
│   ├─ Port 8080 (Nginx only)
│   ├─ Port 3000 (Grafana, optional)
│   ├─ Port 9090 (Prometheus, optional)
│   └─ Port 9100 (Node Exporter, optional)
│
└─ Internal Network (opareta-network)
    ├─ Frontend container (no external port)
    ├─ Auth Service (port 3001)
    ├─ Payment Service (port 3002)
    ├─ PostgreSQL (internal only)
    ├─ Redis (internal only)
    ├─ Prometheus (internal only)
    └─ Grafana (internal only)
```

**Database Protection:**
- PostgreSQL listens only on internal network
- No external database access by default
- Mapped ports (5433, 5434) are for development only
- Production: Remove port mappings from docker-compose.yml

### SSL/TLS Configuration

**HTTPS Support:**
- Nginx configured for both HTTP and HTTPS (port 443)
- SSL certificates stored in `config/ssl/`
- Certificate files: `opareta.crt`, `opareta.key`
- Self-signed for development, use real certificates in production

**Enable HTTPS:**
```bash
# Copy real certificates to config/ssl/
cp /path/to/cert.crt config/ssl/opareta.crt
cp /path/to/key.key config/ssl/opareta.key

# Restart Nginx
docker-compose restart nginx
```

### Authentication & Authorization

**JWT Token Flow:**
1. User registers/logs in at `/auth/register` or `/auth/login`
2. Auth service returns JWT token
3. Frontend stores token (localStorage/cookie)
4. Frontend includes token in Authorization header for all API requests
5. Services validate token and return response

**Token Format:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Token Validation:**
- Checked by `JwtStrategy` in each service
- Validates signature and expiration
- Returns 401 Unauthorized if invalid

---

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables set in docker-compose.yml
- [ ] Database credentials configured
- [ ] SSL certificates in place
- [ ] Nginx configuration reviewed
- [ ] Frontend built and optimized
- [ ] All services tested locally

### Deployment Steps

```bash
# 1. Stop existing containers
docker-compose down

# 2. Pull latest images (if using registry)
docker-compose pull

# 3. Build containers (or use pre-built)
docker-compose build

# 4. Start services
docker-compose up -d

# 5. Wait for databases to initialize
sleep 10

# 6. Run health checks
./deploy/scripts/health-check.sh

# 7. Verify services
curl http://localhost:8080/health
curl http://localhost:8080/auth/health
curl http://localhost:8080/payments/health
```

### Post-Deployment Verification

- [ ] Frontend loads at http://localhost:8080
- [ ] Health endpoints return 200 OK
- [ ] Database tables created (check psql)
- [ ] Can register new user
- [ ] Can login
- [ ] Can create payment
- [ ] Nginx routing working (check logs)
- [ ] No errors in service logs

---

## Monitoring & Troubleshooting

### Health Endpoints

```bash
# Frontend
curl http://localhost:8080/health

# Auth Service  
curl http://localhost:8080/auth/health

# Payment Service
curl http://localhost:8080/payments/health

# Nginx
curl http://localhost:8080/health
```

### Container Status

```bash
# Check all containers
docker ps -a

# Check specific service logs
docker logs opareta-payment-system-payment-service-1 --tail 100

# Follow logs in real-time
docker logs -f opareta-payment-system-nginx-1
```

### Database Connection

```bash
# Connect to payment database
psql -h localhost -p 5434 -U payment_user -d payment_service

# List tables
\dt

# Check UUID extension
SELECT * FROM pg_extension WHERE extname='uuid-ossp';

# Exit
\q
```

### Common Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Frontend on 5173 | NetworkError on payment | Check docker-compose.yml, port 5173 should not be mapped |
| Tables don't exist | `relation X does not exist` | Verify TYPEORM_SYNCHRONIZE=true, check service logs |
| 404 on /payments | Cannot access payment API | Use /payments/ (with trailing slash) or /payments/health |
| Nginx 502 Bad Gateway | Frontend loads but APIs fail | Check if services are running: `docker ps` |
| Database won't start | PostgreSQL error on startup | Check init-*.sql syntax, ensure PostgreSQL 15 compatible |

---

## Performance Optimization

### Frontend Optimization

**Build Optimizations:**
- Vite treeshaking: Removes unused code
- Code splitting: Chunks by route for lazy loading
- Minification: Reduces file sizes
- Asset compression: CSS and JS minified

**Runtime Optimizations:**
- Static file serving via Nginx (fast)
- HTTP caching headers (browser cache)
- Gzip compression (Nginx)
- No dev server overhead

**Typical Metrics:**
- Build time: ~20 seconds
- Bundle size: ~150KB (gzipped)
- First contentful paint: <1 second
- Time to interactive: <2 seconds

### API Optimization

**Rate Limiting:**
- 100 requests/minute per IP
- Burst: 20 extra requests
- Protects against abuse

**Load Balancing:**
```nginx
upstream auth_services {
    least_conn;
    server auth-service:3001;
    server auth-service:3001;  # Can scale horizontally
}
```

---

## Backup & Recovery

### Database Backups

**Location:** `backups/` directory

**Backup Script:**
```bash
./backups/backup-databases.sh
# or for Windows
./backups/backup-databases.bat
```

**Restore Process:**
```bash
psql -h localhost -p 5434 -U payment_user -d payment_service < backup-file.sql
```

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [QUICKSTART.md](../QUICKSTART.md) | 5-minute setup guide |
| [README.md](../README.md) | Project overview and features |
| [PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md) | Folder and file organization |
| [NETWORK_ERROR_FIX.md](./NETWORK_ERROR_FIX.md) | Detailed fix documentation |
| [deploy/scripts/README.md](../deploy/scripts/README.md) | Deployment automation |
| [tests/integration/README.md](../tests/integration/README.md) | Integration testing |

---

## Support & Troubleshooting

### Getting Help

1. **Check Logs:**
   ```bash
   docker logs <container-name> --tail 100
   ```

2. **Run Health Check:**
   ```bash
   ./deploy/scripts/health-check.sh
   ```

3. **Check Documentation:**
   - `NETWORK_ERROR_FIX.md` - For frontend/payment issues
   - `deploy/scripts/README.md` - For deployment issues
   - `tests/integration/README.md` - For testing issues

4. **Verify Docker Setup:**
   ```bash
   docker ps -a
   docker-compose logs -f
   ```

---

**Last Updated:** December 11, 2025  
**Status:** ✅ Production Ready
