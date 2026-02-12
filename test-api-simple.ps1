Write-Host "Testing Opareta API Endpoints"
Write-Host "================================"

Write-Host "`nTest 1: Auth Service Health" -ForegroundColor Cyan
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/auth/health" -Method GET -ErrorAction SilentlyContinue
    Write-Host "Status: $($resp.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($resp.Content)"
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`nTest 2: Payment Service Health" -ForegroundColor Cyan
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3002/health" -Method GET -ErrorAction SilentlyContinue
    Write-Host "Status: $($resp.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($resp.Content)"
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`nTest 3: Register User" -ForegroundColor Cyan
$body = '{"phone_number":"256701234567","email":"test@opareta.com","password":"Test123456"}'
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/auth/register" -Method POST -ContentType "application/json" -Body $body -SkipHttpErrorCheck -ErrorAction SilentlyContinue
    Write-Host "Status: $($resp.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($resp.Content)"
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`nTest 4: Login User" -ForegroundColor Cyan
$body = '{"phone_number":"256701234567","password":"Test123456"}'
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $body -SkipHttpErrorCheck -ErrorAction SilentlyContinue
    Write-Host "Status: $($resp.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($resp.Content)"
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n=== System Status ==="
docker-compose ps --format "table {{.Name}}\t{{.Status}}"
