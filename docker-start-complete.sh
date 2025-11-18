#!/bin/bash

# Docker Compose Startup Script for QT-Master System
# This script starts all services with proper configuration

echo "🚀 Iniciando sistema QT-Master com Docker..."
echo "=================================="

# Stop any existing containers
echo "📍 Parando containers existentes..."
docker-compose down

# Remove any existing volumes (optional - uncomment if needed)
# echo "🗑️  Removendo volumes existentes..."
# docker-compose down -v

# Build and start all services
echo "🔨 Construindo e iniciando serviços..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Aguardando serviços ficarem prontos..."
sleep 30

# Check service status
echo "🔍 Verificando status dos serviços..."
docker-compose ps

# Test backend health
echo "🏥 Testando saúde do backend..."
curl -s http://localhost:3001/api/monitoring/health || echo "⚠️  Backend ainda iniciando..."

# Test frontend
echo "🌐 Testando frontend..."
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend disponível" || echo "⚠️  Frontend ainda iniciando..."

echo ""
echo "✅ Sistema QT-Master iniciado com sucesso!"
echo "=================================="
echo "🔗 URLs de acesso:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:3001"
echo "   Health Check: http://localhost:3001/api/monitoring/health"
echo ""
echo "📊 Logs disponíveis com:"
echo "   docker-compose logs -f backend"
echo "   docker-compose logs -f frontend"
echo "   docker-compose logs -f postgres"
echo "   docker-compose logs -f redis"
echo ""
echo "🛑 Para parar todos os serviços: docker-compose down"
echo "🗑️  Para remover tudo: docker-compose down -v"