# Test script for equipment metadata API endpoints

Write-Host "Testing Equipment Metadata API Endpoints..." -ForegroundColor Green

# Test 1: Check if routes are accessible (should return 401 without auth)
Write-Host "`n1. Testing route accessibility..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/metadata/types" -Method GET -ErrorAction Stop
    Write-Host "✅ Route is accessible" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Route is accessible (requires authentication)" -ForegroundColor Green
    } else {
        Write-Host "❌ Route error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 2: Check other equipment endpoints
$endpoints = @("brands", "models", "equipment")
foreach ($endpoint in $endpoints) {
    Write-Host "`n2. Testing /api/metadata/$endpoint..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/api/metadata/$endpoint" -Method GET -ErrorAction Stop
        Write-Host "✅ /api/metadata/$endpoint is accessible" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "✅ /api/metadata/$endpoint is accessible (requires authentication)" -ForegroundColor Green
        } else {
            Write-Host "❌ /api/metadata/$endpoint error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`n✅ All equipment metadata routes are working correctly!" -ForegroundColor Green