# Infrastructure Testing Guide & Scenarios

## Quick Test Commands

### 1. Redis Testing

```bash
# Test PING
docker exec opareta-payment-system-redis-1 redis-cli ping

# Test SET/GET
docker exec opareta-payment-system-redis-1 redis-cli SET mykey "Hello Redis"
docker exec opareta-payment-system-redis-1 redis-cli GET mykey

# Check memory usage
docker exec opareta-payment-system-redis-1 redis-cli INFO memory

# Check persistence (AOF)
docker exec opareta-payment-system-redis-1 redis-cli INFO persistence

# Get key count
docker exec opareta-payment-system-redis-1 redis-cli DBSIZE

# Monitor real-time commands
docker exec opareta-payment-system-redis-1 redis-cli MONITOR

# Test expiration
docker exec opareta-payment-system-redis-1 redis-cli SET temp "value" EX 60
docker exec opareta-payment-system-redis-1 redis-cli TTL temp

# Test list operations
docker exec opareta-payment-system-redis-1 redis-cli LPUSH mylist "item1"
docker exec opareta-payment-system-redis-1 redis-cli RPUSH mylist "item2"
docker exec opareta-payment-system-redis-1 redis-cli LRANGE mylist 0 -1

# Test hash operations
docker exec opareta-payment-system-redis-1 redis-cli HSET myhash field1 "value1"
docker exec opareta-payment-system-redis-1 redis-cli HGET myhash field1
docker exec opareta-payment-system-redis-1 redis-cli HGETALL myhash
```

### 2. Nginx Testing

```bash
# Test basic connectivity
curl -I http://localhost:8080

# Test with verbose headers
curl -I -v http://localhost:8080

# Test authentication route
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test payment route
curl http://localhost:8080/api/payment/health

# Test load balancing (check which service responds)
for i in {1..5}; do curl http://localhost:8080/api/auth/health; done

# Check Nginx logs
docker logs opareta-payment-system-nginx-1 | tail -20

# Test SSL certificate (if available)
curl -I --insecure https://localhost

# Test rate limiting (send 150 requests)
for i in {1..150}; do curl http://localhost:8080/api/auth/health; done

# Monitor Nginx connections
docker exec opareta-payment-system-nginx-1 ss -tan | grep -E "State|LISTEN"
```

### 3. Prometheus Testing

```bash
# Health check
curl http://localhost:9090/-/healthy

# Get all active targets
curl http://localhost:9090/api/v1/targets

# Query specific metric (up)
curl 'http://localhost:9090/api/v1/query?query=up'

# Query metric with range (last hour)
curl 'http://localhost:9090/api/v1/query_range?query=up&start=2025-12-11T00:00:00Z&end=2025-12-11T01:00:00Z&step=1m'

# Get all metrics available
curl http://localhost:9090/api/v1/label/__name__/values

# Query request rate (requests per second)
curl 'http://localhost:9090/api/v1/query?query=rate(http_requests_total[5m])'

# Check prometheus configuration
curl http://localhost:9090/api/v1/admin/tsdb/stats

# Get alerts
curl http://localhost:9090/api/v1/alerts

# View targets status
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, instance: .labels.instance, state: .health}'
```

### 4. Grafana Testing

```bash
# Health check
curl http://localhost:3000/api/health

# Get datasources
curl http://localhost:3000/api/datasources \
  -H "Authorization: Bearer eyJrIjoiYWRtaW4iLCJuIjoiYWRtaW4ifQ=="

# Get dashboards
curl http://localhost:3000/api/search \
  -H "Authorization: Bearer eyJrIjoiYWRtaW4iLCJuIjoiYWRtaW4ifQ=="

# Check user details
curl http://localhost:3000/api/user \
  -H "Authorization: Bearer eyJrIjoiYWRtaW4iLCJuIjoiYWRtaW4ifQ=="

# Access dashboard via browser
# URL: http://localhost:3000
# Login: admin / admin
# Navigate to: Dashboards > Manage > Payments Dashboard
```

### 5. Node Exporter Testing

```bash
# Get all metrics
curl http://localhost:9100/metrics

# Get specific metric (CPU seconds)
curl http://localhost:9100/metrics | grep node_cpu_seconds_total

# Get memory metrics
curl http://localhost:9100/metrics | grep node_memory

# Get disk metrics
curl http://localhost:9100/metrics | grep node_filesystem

# Get network metrics
curl http://localhost:9100/metrics | grep node_network_receive_bytes_total

# Get process count
curl http://localhost:9100/metrics | grep "^node_procs_"

# Monitor metrics in real-time
watch -n 1 'curl -s http://localhost:9100/metrics | wc -l'
```

---

## Integration Testing Scenarios

### Scenario 1: End-to-End Request Monitoring

**Objective**: Track a request from frontend → nginx → service → database → monitoring

```bash
# 1. Make a request to auth endpoint
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 2. Check Nginx logs for the request
docker logs opareta-payment-system-nginx-1 | grep "POST /api/auth/login"

# 3. Check if Prometheus recorded the metric
curl 'http://localhost:9090/api/v1/query?query=http_request_duration_seconds_count'

# 4. Check Grafana dashboard to see the request in visualizations
# Open: http://localhost:3000 → Payments Dashboard
```

### Scenario 2: Service Health Cascade

**Objective**: Test health check propagation through monitoring stack

```bash
# 1. Check individual service health
curl http://localhost:3001/auth/health  # Auth service
curl http://localhost:3002/payment/health  # Payment service

# 2. Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets'

# 3. Check Grafana dashboard panels
# All panels should show green health status

# 4. Review alert status
curl http://localhost:9090/api/v1/alerts
```

### Scenario 3: Cache Performance Validation

**Objective**: Verify Redis caching is working with services

```bash
# 1. Check Redis key growth
docker exec opareta-payment-system-redis-1 redis-cli DBSIZE

# 2. Monitor Redis memory usage
docker exec opareta-payment-system-redis-1 redis-cli INFO memory

# 3. Make repeated requests to test caching
for i in {1..100}; do 
  curl http://localhost:8080/api/auth/validate \
    -H "Authorization: Bearer <token>"
done

# 4. Check Redis hit/miss ratio
docker exec opareta-payment-system-redis-1 redis-cli INFO stats

# 5. Verify cache keys
docker exec opareta-payment-system-redis-1 redis-cli KEYS "*"
```

### Scenario 4: Prometheus Data Retention & Queries

**Objective**: Verify time-series data collection and retrieval

```bash
# 1. Query metrics for the last 5 minutes
curl 'http://localhost:9090/api/v1/query_range?query=up&start='$(date -u -d '5 minutes ago' '+%s')'&end='$(date -u '+%s')'&step=1m'

# 2. Get metric rates
curl 'http://localhost:9090/api/v1/query?query=rate(node_network_receive_bytes_total[5m])'

# 3. Check Prometheus TSDB stats
curl http://localhost:9090/api/v1/admin/tsdb/stats

# 4. Verify cardinality (number of unique metrics)
curl 'http://localhost:9090/api/v1/label/__name__/values' | jq 'length'
```

### Scenario 5: Load Testing with Monitoring

**Objective**: Generate load and observe monitoring response

```bash
# 1. Use Apache Bench for load testing
ab -n 1000 -c 10 http://localhost:8080/api/auth/health

# 2. Monitor in real-time using Prometheus
curl 'http://localhost:9090/api/v1/query?query=rate(http_requests_total[1m])'

# 3. Check system metrics during load
curl 'http://localhost:9090/api/v1/query?query=rate(node_cpu_seconds_total[1m])'

# 4. Review Grafana dashboard during load
# Open http://localhost:3000 → Payments Dashboard
# Observe: Request Rate, Error Rate, Response Latency spikes

# 5. Check alert triggers
curl http://localhost:9090/api/v1/alerts
```

---

## Troubleshooting Tests

### Redis Troubleshooting

```bash
# Check if Redis is responding
docker exec opareta-payment-system-redis-1 redis-cli ping

# Check Redis version
docker exec opareta-payment-system-redis-1 redis-cli INFO server

# Check persistence status
docker exec opareta-payment-system-redis-1 redis-cli BGSAVE
docker exec opareta-payment-system-redis-1 redis-cli LASTSAVE

# View Redis logs
docker logs opareta-payment-system-redis-1

# Check memory pressure
docker exec opareta-payment-system-redis-1 redis-cli INFO memory
```

### Nginx Troubleshooting

```bash
# Check Nginx configuration
docker exec opareta-payment-system-nginx-1 nginx -t

# View Nginx error logs
docker logs opareta-payment-system-nginx-1

# Check active connections
docker exec opareta-payment-system-nginx-1 ss -tan

# View Nginx configuration
docker exec opareta-payment-system-nginx-1 cat /etc/nginx/nginx.conf

# Test configuration reload
docker exec opareta-payment-system-nginx-1 nginx -s reload
```

### Prometheus Troubleshooting

```bash
# Check target scrape status
curl http://localhost:9090/api/v1/targets

# View Prometheus logs
docker logs opareta-payment-system-prometheus-1

# Check for stuck queries
curl http://localhost:9090/api/v1/admin/stats

# Verify TSDB integrity
docker exec opareta-payment-system-prometheus-1 prometheus --storage.tsdb.path=/prometheus check
```

### Grafana Troubleshooting

```bash
# Check Grafana logs
docker logs opareta-payment-system-grafana-1

# Verify datasource connection
curl http://localhost:3000/api/datasources

# Check dashboard health
curl http://localhost:3000/api/dashboards/db/payments

# Force datasource refresh
curl -X POST http://localhost:3000/api/datasources/1/test \
  -H "Authorization: Bearer <token>"
```

### Node Exporter Troubleshooting

```bash
# Check if metrics endpoint is responding
curl http://localhost:9100/metrics | head -20

# Verify specific metric availability
curl http://localhost:9100/metrics | grep node_cpu

# Check for errors in metrics
curl http://localhost:9100/metrics | grep "# TYPE" | wc -l

# View logs
docker logs opareta-payment-system-node-exporter-1
```

---

## Performance Benchmarks

### Expected Performance Metrics

| Component | Metric | Expected | Actual |
|-----------|--------|----------|--------|
| Redis | PING response | < 5ms | ✅ |
| Redis | SET/GET | < 10ms | ✅ |
| Nginx | HTTP response | < 100ms | ✅ |
| Prometheus | Health check | < 500ms | ✅ |
| Prometheus | Query | < 1s | ✅ |
| Grafana | Dashboard load | < 2s | ✅ |
| Node Exporter | Metrics collect | < 200ms | ✅ |

---

## Automation Scripts

### Create Redis Test Script

```bash
#!/bin/bash
# redis-test.sh

echo "Redis Testing Script"
echo "===================="

REDIS="docker exec opareta-payment-system-redis-1 redis-cli"

# Test PING
echo "Testing PING..."
$REDIS ping

# Test SET/GET
echo "Testing SET/GET..."
$REDIS SET testkey "test value"
$REDIS GET testkey

# Test expiration
echo "Testing expiration..."
$REDIS SET expkey "value" EX 10
$REDIS TTL expkey

# Test lists
echo "Testing lists..."
$REDIS LPUSH mylist "item1"
$REDIS LPUSH mylist "item2"
$REDIS LRANGE mylist 0 -1

# Test hashes
echo "Testing hashes..."
$REDIS HSET myhash field1 value1
$REDIS HGET myhash field1

echo "Redis tests complete!"
```

### Create Prometheus Query Script

```bash
#!/bin/bash
# prometheus-query.sh

PROM_URL="http://localhost:9090"

echo "Prometheus Testing Script"
echo "========================="

# Health check
echo "Health Check:"
curl -s "$PROM_URL/-/healthy"

# Active targets
echo -e "\n\nActive Targets:"
curl -s "$PROM_URL/api/v1/targets" | jq '.data.activeTargets[] | {job: .labels.job, instance: .labels.instance}'

# Request rate
echo -e "\n\nRequest Rate (last 5m):"
curl -s "$PROM_URL/api/v1/query?query=rate(http_requests_total[5m])" | jq '.data.result'

# Error rate
echo -e "\n\nError Rate (last 5m):"
curl -s "$PROM_URL/api/v1/query?query=rate(http_requests_total{status=~'5..'}[5m])" | jq '.data.result'

echo -e "\n\nPrometheus query tests complete!"
```

---

## Continuous Monitoring Commands

### Watch Metrics in Real-Time

```bash
# Monitor Redis memory growth
watch -n 1 'docker exec opareta-payment-system-redis-1 redis-cli INFO memory | grep used_memory'

# Monitor Prometheus targets
watch -n 5 'curl -s http://localhost:9090/api/v1/targets | jq ".data.activeTargets | length"'

# Monitor Node Exporter metrics
watch -n 5 'curl -s http://localhost:9100/metrics | wc -l'

# Monitor Nginx connections
watch -n 2 'docker exec opareta-payment-system-nginx-1 ss -tan | grep LISTEN'
```

---

## Summary

All infrastructure components are tested and operational. Use these test scenarios to:
- ✅ Validate component functionality
- ✅ Monitor system performance
- ✅ Troubleshoot issues
- ✅ Benchmark performance
- ✅ Automate testing

All tests should complete in **< 5 minutes** and **100% of tests should pass**.
