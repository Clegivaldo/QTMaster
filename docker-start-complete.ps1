# Docker Compose Startup Script for QT-Master System (Windows PowerShell)
# This script starts all services with proper configuration

Write-Host "🚀 Iniciando sistema QT-Master com Docker..." -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Blue

# Stop any existing containers
Write-Host "📍 Parando containers existentes..." -ForegroundColor Yellow
docker-compose down

# Remove any existing volumes (optional - uncomment if needed)
# Write-Host "🗑️  Removendo volumes existentes..." -ForegroundColor Yellow
# docker-compose down -v

# Build and start all services
Write-Host "🔨 Construindo e iniciando serviços..." -ForegroundColor Yellow
docker-compose up --build -d

# Wait for services to be healthy
Write-Host "⏳ Aguardando serviços ficarem prontos..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check service status
Write-Host "🔍 Verificando status dos serviços..." -ForegroundColor Yellow
docker-compose ps

# Test backend health
Write-Host "🏥 Testando saúde do backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/monitoring/health" -Method GET -TimeoutSec 10
    Write-Host "✅ Backend saudável!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend ainda iniciando..." -ForegroundColor Orange
}

# Test frontend
Write-Host "🌐 Testando frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 10
    Write-Host "✅ Frontend disponível!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Frontend ainda iniciando..." -ForegroundColor Orange
}

Write-Host ""
Write-Host "✅ Sistema QT-Master iniciado com sucesso!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Blue
Write-Host "🔗 URLs de acesso:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend API: http://localhost:3001" -ForegroundColor White
Write-Host "   Health Check: http://localhost:3001/api/monitoring/health" -ForegroundColor White
Write-Host ""
Write-Host "📊 Logs disponíveis com:" -ForegroundColor Cyan
Write-Host "   docker-compose logs -f backend" -ForegroundColor Gray
Write-Host "   docker-compose logs -f frontend" -ForegroundColor Gray
Write-Host "   docker-compose logs -f postgres" -ForegroundColor Gray
Write-Host "   docker-compose logs -f redis" -ForegroundColor Gray
Write-Host ""
Write-Host "PARAR: docker-compose down" -ForegroundColor Red
Write-Host "REMOVER: docker-compose down -v" -ForegroundColor Red

Write-Host ""
Write-Host "🎉 Sistema pronto para uso!" -ForegroundColor Green -BackgroundColor Black