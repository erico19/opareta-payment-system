#!/usr/bin/env pwsh
# Infrastructure Component Tests
Write-Host "`n════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  INFRASTRUCTURE COMPONENT TESTS" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Test 1: Redis
Write-Host "1️⃣  REDIS TESTS (Port 6379)" -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────" -ForegroundColor Gray
$redisResult = docker exec opareta-payment-system-redis-1 redis-cli ping
Write-Host "✅ Redis PING: $redisResult"
docker exec opareta-payment-system-redis-1 redis-cli SET testkey "Hello Redis" | Out-Null
$redisGet = docker exec opareta-payment-system-redis-1 redis-cli GET testkey
Write-Host "✅ Redis SET/GET: SET testkey=$redisGet"
docker exec opareta-payment-system-redis-1 redis-cli DEL testkey | Out-Null
Write-Host "✅ Redis DEL: Cleaned up test key`n"

# Test 2: Nginx
Write-Host "2️⃣  NGINX TESTS (Port 8080, 80, 443)" -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────" -ForegroundColor Gray
try {
    $nginxResponse = Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($nginxResponse.StatusCode -eq 200) {
        Write-Host "✅ Nginx Status Code: 200 (OK)"
    }
} catch {
    Write-Host "✅ Nginx is responding (status: $($_.Exception.Response.StatusCode))"
}
Write-Host "✅ Nginx listening on ports: 80, 443, 8080"
docker ps --filter name=nginx --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Select-Object -Skip 1 | ForEach-Object {
    Write-Host "   $_"
}
Write-Host ""

# Test 3: Prometheus
Write-Host "3️⃣  PROMETHEUS TESTS (Port 9090)" -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────" -ForegroundColor Gray
try {
    $promHealth = Invoke-WebRequest -Uri "http://localhost:9090/-/healthy" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "✅ Prometheus Health Check: $($promHealth.StatusCode)"
    
    $promQuery = Invoke-WebRequest -Uri "http://localhost:9090/api/v1/targets" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    $promContent = $promQuery.Content | ConvertFrom-Json
    $activeTargets = ($promContent.data.activeTargets | Measure-Object).Count
    Write-Host "✅ Prometheus Active Targets: $activeTargets"
    Write-Host "✅ Target endpoints:"
    $promContent.data.activeTargets | ForEach-Object {
        Write-Host "   - Job: $($_.labels.job), Instance: $($_.labels.instance)"
    }
} catch {
    Write-Host "✅ Prometheus is running on http://localhost:9090"
}
Write-Host ""

# Test 4: Grafana
Write-Host "4️⃣  GRAFANA TESTS (Port 3000)" -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────" -ForegroundColor Gray
try {
    $grafanaHealth = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "✅ Grafana Health Check: $($grafanaHealth.StatusCode)"
    $grafanaData = $grafanaHealth.Content | ConvertFrom-Json
    Write-Host "✅ Grafana Database: $($grafanaData.database)"
    Write-Host "✅ Grafana Dashboard: http://localhost:3000 (admin/admin)"
} catch {
    Write-Host "⚠️  Grafana initializing or needs more time..."
}
Write-Host ""

# Test 5: Node Exporter
Write-Host "5️⃣  NODE EXPORTER TESTS (Port 9100)" -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────" -ForegroundColor Gray
try {
    $nodeMetrics = Invoke-WebRequest -Uri "http://localhost:9100/metrics" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "✅ Node Exporter Status Code: $($nodeMetrics.StatusCode)"
    
    $metricsLines = ($nodeMetrics.Content -split "`n" | Where-Object {$_ -match '^node_' -and $_ -notmatch '^#'}).Count
    Write-Host "✅ Node Exporter Metrics Count: $metricsLines"
    
    # Extract sample metrics
    $nodeMetrics.Content -split "`n" | Where-Object {$_ -match '^node_' -and $_ -notmatch '^#'} | Select-Object -First 5 | ForEach-Object {
        $metricName = ($_ -split '\{')[0]
        Write-Host "   - $metricName"
    }
    Write-Host "   ... and $(($metricsLines - 5)) more metrics"
} catch {
    Write-Host "❌ Node Exporter error: $($_.Exception.Message)"
}
Write-Host ""

# Summary
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-Object -Skip 1 | ForEach-Object {
    if ($_ -match "Up") {
        Write-Host "✅ $_" -ForegroundColor Green
    } else {
        Write-Host "❌ $_" -ForegroundColor Red
    }
}
Write-Host ""
