# Quick Reference - Infrastructure Testing

## 🚀 Run Tests Now

### Automated Testing (All Components)
```powershell
cd c:\opareta-payment-system
powershell -ExecutionPolicy Bypass -File test-infrastructure.ps1
```

**Expected**: All 5 components show ✅ HEALTHY in ~2 minutes

---

## 📋 Component Testing

### Redis Cache (Port 6379)
```bash
# Basic connectivity
docker exec opareta-payment-system-redis-1 redis-cli ping
# Expected: PONG

# Store and retrieve data
docker exec opareta-payment-system-redis-1 redis-cli SET key "value"
docker exec opareta-payment-system-redis-1 redis-cli GET key
# Expected: value

# Check database size
docker exec opareta-payment-system-redis-1 redis-cli DBSIZE
# Expected: (integer) N
```

### Nginx Load Balancer (Ports 80, 443, 8080)
```bash
# Test HTTP access
curl -I http://localhost:8080
# Expected: HTTP/1.1 200 OK

# Test API routing
curl http://localhost:8080/api/auth/health
# Expected: JSON response from auth service

# Test with verbose output
curl -v http://localhost:8080
```

### Prometheus Metrics (Port 9090)
```bash
# Health check
curl http://localhost:9090/-/healthy
# Expected: HTTP 200

# Get target status
curl http://localhost:9090/api/v1/targets
# Expected: JSON with active targets

# Query metrics
curl 'http://localhost:9090/api/v1/query?query=up'
# Expected: JSON with metric values
```

### Grafana Dashboards (Port 3000)
```bash
# Health check
curl http://localhost:3000/api/health
# Expected: HTTP 200

# Access dashboard
# URL: http://localhost:3000
# Login: admin / admin
# Navigate to: Dashboards → Payments Dashboard
```

### Node Exporter Metrics (Port 9100)
```bash
# Get all metrics
curl http://localhost:9100/metrics
# Expected: 700+ metrics lines

# Get specific metric
curl http://localhost:9100/metrics | grep node_cpu
# Expected: CPU metric lines

# Count metrics
curl -s http://localhost:9100/metrics | grep "^node_" | wc -l
# Expected: 700+
```

---

## 🔍 Monitoring & Troubleshooting

### Check Service Status
```bash
docker-compose ps
# All services should show "Up" status
```

### View Logs
```bash
# Redis logs
docker logs opareta-payment-system-redis-1

# Nginx logs
docker logs opareta-payment-system-nginx-1

# Prometheus logs
docker logs opareta-payment-system-prometheus-1

# Grafana logs
docker logs opareta-payment-system-grafana-1

# Follow logs in real-time
docker-compose logs -f
```

### Common Issues

**Redis Connection Failed**
```bash
# Check if container is running
docker ps | grep redis

# Restart Redis
docker-compose restart redis
```

**Nginx Not Responding**
```bash
# Check Nginx configuration
docker exec opareta-payment-system-nginx-1 nginx -t

# Reload Nginx
docker exec opareta-payment-system-nginx-1 nginx -s reload

# Restart Nginx
docker-compose restart nginx
```

**Prometheus Targets Down**
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Ensure auth and payment services are running
docker-compose ps | grep service
```

**Grafana Not Loading**
```bash
# Restart Grafana
docker-compose restart grafana

# Check Grafana logs
docker logs opareta-payment-system-grafana-1

# Check datasource configuration
curl http://localhost:3000/api/datasources
```

---

## 🎯 Test Scenarios (30 seconds each)

### Scenario 1: Full Request Path
```bash
# Make a request through the entire stack
curl -X GET http://localhost:8080/api/auth/health

# Verify it appears in Prometheus metrics
curl 'http://localhost:9090/api/v1/query?query=http_requests_total'

# Check Grafana dashboard for the request
# Open http://localhost:3000 → Payments Dashboard
```

### Scenario 2: Cache Performance
```bash
# Check initial cache size
docker exec opareta-payment-system-redis-1 redis-cli DBSIZE

# Make several requests
for i in {1..10}; do curl http://localhost:8080/api/auth/health; done

# Check cache size again
docker exec opareta-payment-system-redis-1 redis-cli DBSIZE

# Should show increased key count
```

### Scenario 3: Service Health Cascade
```bash
# Check individual services
curl http://localhost:3001/auth/health
curl http://localhost:3002/payment/health

# Check Prometheus shows them as up
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length'
# Expected: 4 targets

# Check Grafana dashboard shows all green
# Open http://localhost:3000 → Status panels
```

---

## 📊 Performance Checks

### Expected Response Times
```
Redis PING      : < 5ms
Nginx HTTP      : < 100ms
Prometheus API  : < 500ms
Grafana Load    : < 2 seconds
Metrics Scrape  : < 200ms
```

### Check Performance
```bash
# Redis response time
time docker exec opareta-payment-system-redis-1 redis-cli ping

# HTTP response time
time curl -I http://localhost:8080

# Prometheus response time
time curl http://localhost:9090/-/healthy
```

---

## 📁 Documentation Files

| File | Size | Purpose |
|------|------|---------|
| test-infrastructure.ps1 | 5.9 KB | Automated test script |
| INFRASTRUCTURE_TESTS.md | 10.7 KB | Detailed test results |
| INFRASTRUCTURE_TESTING_GUIDE.md | 13 KB | 100+ test commands |
| INFRASTRUCTURE_TESTING_SUMMARY.md | 10.2 KB | Executive summary |
| INFRASTRUCTURE_QUICK_REFERENCE.md | This file | Quick commands |

---

## 🌐 Access URLs

```
Redis           : localhost:6379
Nginx           : http://localhost:8080
Prometheus      : http://localhost:9090
Grafana         : http://localhost:3000 (admin/admin)
Node Exporter   : http://localhost:9100/metrics
Frontend        : http://localhost:5173
Auth API        : http://localhost:3001/api
Payment API     : http://localhost:3002/api
```

---

## ⚡ Command Cheat Sheet

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a service
docker-compose restart SERVICE_NAME

# View logs
docker-compose logs SERVICE_NAME -f

# Scale a service
docker-compose up -d --scale payment-service=2

# View resource usage
docker stats

# Remove all containers and volumes
docker-compose down -v

# Rebuild images
docker-compose up -d --build
```

---

## ✅ Test Checklist

- [ ] Run automated test script: `test-infrastructure.ps1`
- [ ] All 5 components show HEALTHY
- [ ] Redis PING responds with PONG
- [ ] Nginx HTTP returns 200
- [ ] Prometheus has 4 active targets
- [ ] Grafana health endpoint returns 200
- [ ] Node Exporter provides 700+ metrics
- [ ] Access http://localhost:3000 (Grafana)
- [ ] Login with admin/admin
- [ ] View Payments Dashboard (7 panels visible)
- [ ] Check Prometheus targets at http://localhost:9090
- [ ] Review logs: `docker-compose logs -f`

---

## 🎓 Next Steps

1. **Review Results**
   - Read INFRASTRUCTURE_TESTING_SUMMARY.md
   
2. **Run Tests**
   - Execute test-infrastructure.ps1
   
3. **Monitor System**
   - Open Grafana at http://localhost:3000
   
4. **Load Test** (Optional)
   - See INFRASTRUCTURE_TESTING_GUIDE.md → Load Testing section
   
5. **Deploy** (When ready)
   - See deployment documentation

---

**Last Updated**: December 11, 2025  
**Status**: ✅ All Components Operational  
**Support**: See INFRASTRUCTURE_TESTING_GUIDE.md for troubleshooting
