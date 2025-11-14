#!/bin/bash

# Script para executar o sistema completo no Docker
# Sistema de Laudos com Assinatura Digital e Compartilhamento Seguro

set -e

echo "🚀 Iniciando Sistema de Laudos no Docker..."
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para verificar se Docker está rodando
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker não está rodando. Por favor, inicie o Docker e tente novamente.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker está rodando${NC}"
}

# Função para verificar se docker-compose está instalado
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ docker-compose não está instalado${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ docker-compose está instalado${NC}"
}

# Verificar pré-requisitos
echo -e "${BLUE}📋 Verificando pré-requisitos...${NC}"
check_docker
check_docker_compose
echo ""

# Parar containers existentes
echo -e "${BLUE}🛑 Parando containers existentes...${NC}"
docker-compose down
echo ""

# Criar diretórios necessários
echo -e "${BLUE}📁 Criando diretórios necessários...${NC}"
mkdir -p backend/uploads/reports
mkdir -p backend/templates
mkdir -p backend/public/images/gallery
mkdir -p backend/signatures
mkdir -p backend/certificates
mkdir -p backend/logs
mkdir -p backend/backups
echo -e "${GREEN}✅ Diretórios criados${NC}"
echo ""

# Build das imagens
echo -e "${BLUE}🏗️  Construindo imagens Docker...${NC}"
docker-compose build --no-cache
echo -e "${GREEN}✅ Imagens construídas${NC}"
echo ""

# Subir os containers
echo -e "${BLUE}🚀 Iniciando containers...${NC}"
docker-compose up -d
echo ""

# Aguardar banco de dados estar pronto
echo -e "${BLUE}⏳ Aguardando PostgreSQL ficar pronto...${NC}"
sleep 5

# Verificar status do banco
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker-compose exec -T postgres pg_isready -U laudo_user -d laudo_db > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL está pronto${NC}"
        break
    fi
    attempt=$((attempt + 1))
    echo -e "${YELLOW}⏳ Tentativa $attempt/$max_attempts...${NC}"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}❌ PostgreSQL não ficou pronto a tempo${NC}"
    exit 1
fi
echo ""

# Executar migrations
echo -e "${BLUE}🔄 Executando migrations do Prisma...${NC}"
docker-compose exec -T backend npx prisma migrate deploy
echo -e "${GREEN}✅ Migrations executadas${NC}"
echo ""

# Gerar Prisma Client
echo -e "${BLUE}🔧 Gerando Prisma Client...${NC}"
docker-compose exec -T backend npx prisma generate
echo -e "${GREEN}✅ Prisma Client gerado${NC}"
echo ""

# Verificar status dos serviços
echo -e "${BLUE}🔍 Verificando status dos serviços...${NC}"
docker-compose ps
echo ""

# Mostrar logs
echo -e "${BLUE}📋 Últimas linhas dos logs:${NC}"
docker-compose logs --tail=20
echo ""

# Informações finais
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Sistema iniciado com sucesso!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}🌐 URLs de Acesso:${NC}"
echo -e "   Frontend: ${YELLOW}http://localhost:3000${NC}"
echo -e "   Backend API: ${YELLOW}http://localhost:5000/api${NC}"
echo -e "   Health Check: ${YELLOW}http://localhost:5000/api/health${NC}"
echo ""
echo -e "${BLUE}🗄️  Banco de Dados:${NC}"
echo -e "   Host: ${YELLOW}localhost:5432${NC}"
echo -e "   Database: ${YELLOW}laudo_db${NC}"
echo -e "   User: ${YELLOW}laudo_user${NC}"
echo ""
echo -e "${BLUE}📦 Redis:${NC}"
echo -e "   Host: ${YELLOW}localhost:6379${NC}"
echo ""
echo -e "${BLUE}🔐 Novos Recursos:${NC}"
echo -e "   ✓ Assinatura Digital de PDFs"
echo -e "   ✓ Compartilhamento Seguro"
echo -e "   ✓ Links Temporários"
echo -e "   ✓ Controle de Acesso (IP, Senha, Limites)"
echo -e "   ✓ Auditoria de Acessos"
echo ""
echo -e "${BLUE}📝 Comandos Úteis:${NC}"
echo -e "   Ver logs: ${YELLOW}docker-compose logs -f${NC}"
echo -e "   Ver logs do backend: ${YELLOW}docker-compose logs -f backend${NC}"
echo -e "   Parar sistema: ${YELLOW}docker-compose down${NC}"
echo -e "   Reiniciar sistema: ${YELLOW}docker-compose restart${NC}"
echo -e "   Acessar backend: ${YELLOW}docker-compose exec backend sh${NC}"
echo -e "   Executar migrations: ${YELLOW}docker-compose exec backend npx prisma migrate deploy${NC}"
echo -e "   Ver banco de dados: ${YELLOW}docker-compose exec backend npx prisma studio${NC}"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
