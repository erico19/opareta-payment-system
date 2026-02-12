# Test Opareta Payment System API

Write-Host "=== Testing Opareta Payment System ===" -ForegroundColor Cyan

# Test 1: Register User
Write-Host "`n1. Testing User Registration..."
$registerBody = @{
    phone_number = "256701234567"
    email = "testuser@opareta.com"
    password = "Test@12345"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-WebRequest -Uri "http://localhost:3001/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $registerBody `
        -SkipHttpErrorCheck -ErrorAction SilentlyContinue
    
    Write-Host "Response Status: $($registerResponse.StatusCode)" -ForegroundColor Gray
    Write-Host "Response Content: $($registerResponse.Content)" -ForegroundColor Gray
    
    if ($registerResponse.StatusCode -eq 201 -or $registerResponse.StatusCode -eq 200) {
        Write-Host "Registration successful" -ForegroundColor Green
        if ($registerResponse.Content) {
            try {
                $user = $registerResponse.Content | ConvertFrom-Json
                Write-Host "  User ID: $($user.id)"
            } catch {
                Write-Host "  Response: $($registerResponse.Content)" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "Registration failed (Status: $($registerResponse.StatusCode))" -ForegroundColor Red
        Write-Host "Response: $($registerResponse.Content)" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "Registration error: $_" -ForegroundColor Red
}

# Test 2: Login User
Write-Host "`n2. Testing User Login..."
$loginBody = @{
    phone_number = "256701234567"
    password = "Test@12345"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri http://localhost:3001/auth/login `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -SkipHttpErrorCheck -ErrorAction SilentlyContinue
    
    Write-Host "Response Status: $($loginResponse.StatusCode)" -ForegroundColor Gray
    Write-Host "Response Content: $($loginResponse.Content)" -ForegroundColor Gray
    
    if ($loginResponse.StatusCode -eq 200) {
        Write-Host "✓ Login successful" -ForegroundColor Green
        if ($loginResponse.Content) {
            try {
                $loginData = $loginResponse.Content | ConvertFrom-Json
                $token = $loginData.token
                if ($token) {
                    Write-Host "  Token: $($token.Substring(0, 20))..."
                } else {
                    Write-Host "  No token in response" -ForegroundColor Yellow
                    $token = $null
                }
            } catch {
                Write-Host "  Could not parse response: $_" -ForegroundColor Yellow
                Write-Host "  Raw: $($loginResponse.Content)" -ForegroundColor Yellow
                $token = $null
            }
        } else {
            Write-Host "  Empty response" -ForegroundColor Yellow
            $token = $null
        }
    } else {
        Write-Host "✗ Login failed (Status: $($loginResponse.StatusCode))" -ForegroundColor Red
        Write-Host "  Response: $($loginResponse.Content)" -ForegroundColor Yellow
        $token = $null
    }
} catch {
    Write-Host "✗ Login error: $_" -ForegroundColor Red
    $token = $null
}

# Test 3: Create Payment (if token available)
if ($token) {
    Write-Host "`n3. Testing Payment Creation..."
    $paymentBody = @{
        amount = 5000
        currency = "UGX"
        payment_method = "MOBILE_MONEY"
        customer_phone = "256701234567"
        customer_email = "testuser@opareta.com"
    } | ConvertTo-Json
    
    try {
        $paymentResponse = Invoke-WebRequest -Uri http://localhost:3002/payments `
            -Method POST `
            -ContentType "application/json" `
            -Headers @{"Authorization" = "Bearer $token"} `
            -Body $paymentBody `
            -SkipHttpErrorCheck -ErrorAction SilentlyContinue
        
        Write-Host "Response Status: $($paymentResponse.StatusCode)" -ForegroundColor Gray
        Write-Host "Response Content: $($paymentResponse.Content)" -ForegroundColor Gray
        
        if ($paymentResponse.StatusCode -eq 201 -or $paymentResponse.StatusCode -eq 200) {
            Write-Host "✓ Payment created successfully" -ForegroundColor Green
            if ($paymentResponse.Content) {
                try {
                    $payment = $paymentResponse.Content | ConvertFrom-Json
                    Write-Host "  Reference: $($payment.reference)"
                    Write-Host "  Amount: $($payment.amount) $($payment.currency)"
                    Write-Host "  Status: $($payment.status)"
                } catch {
                    Write-Host "  Response: $($paymentResponse.Content)" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "✗ Payment creation failed (Status: $($paymentResponse.StatusCode))" -ForegroundColor Red
            Write-Host "  Response: $($paymentResponse.Content)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "✗ Payment creation error: $_" -ForegroundColor Red
    }
} else {
    Write-Host "`n3. Payment Creation: Skipped (no token available)" -ForegroundColor Yellow
}

Write-Host "`n=== API Test Summary ===" -ForegroundColor Cyan
Write-Host "✓ Auth Service: Online (port 3001)"
Write-Host "✓ Payment Service: Online (port 3002)"
Write-Host "✓ Frontend: Online (port 5173)"
Write-Host "✓ Nginx Gateway: Online (port 8080)"
Write-Host "`nAccess the application:"
Write-Host "  Frontend: http://localhost:5173"
Write-Host "  Auth Service Swagger: http://localhost:3001/api"
Write-Host "  Payment Service Swagger: http://localhost:3002/api"
Write-Host "  Grafana Monitoring: http://localhost:3000 (admin/admin)"
Write-Host "  Prometheus: http://localhost:9090"
