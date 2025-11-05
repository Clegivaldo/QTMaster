# Docker Setup - Sistema de Laudos Térmicos

Este documento descreve como configurar e usar o ambiente Docker para o Sistema de Laudos de Qualificação Térmica.

## 📋 Pré-requisitos

- **Docker Desktop** instalado e em execução
- **Node.js 18+** instalado
- **Git** para clonar o repositório

### Verificação dos Pré-requisitos

```bash
# Verificar Docker
docker --version
docker-compose --version

# Verificar Node.js
node --version
npm --version
```

## 🚀 Configuração Rápida

### Windows
```cmd
# Executar script de configuração
scripts\dev-setup.bat
```

### Linux/Mac
```bash
# Tornar o script executável
chmod +x scripts/dev-setup.sh

# Executar script de configuração
./scripts/dev-setup.sh
```

## 🐳 Ambientes Docker

### Desenvolvimento (`docker-compose.dev.yml`)

Ambiente para desenvolvimento local com:
- PostgreSQL na porta 5433
- Redis na porta 6379
- Volumes persistentes para dados

```bash
# Iniciar ambiente de desenvolvimento
docker-compose -f docker-compose.dev.yml up -d

# Parar ambiente
docker-compose -f docker-compose.dev.yml down

# Resetar dados (cuidado!)
docker-compose -f docker-compose.dev.yml down -v
```

### Produção (`docker-compose.yml`)

Ambiente completo com:
- Frontend (porta 3000)
- Backend (porta 5000)
- PostgreSQL (porta 5432)
- Redis (porta 6379)

```bash
# Construir e iniciar todos os serviços
docker-compose up --build -d

# Parar todos os serviços
docker-compose down
```

## 🛠️ Utilitários Docker

### Scripts de Desenvolvimento

**Windows:**
```cmd
# Ver comandos disponíveis
scripts\docker-dev.bat

# Exemplos de uso
scripts\docker-dev.bat start     # Iniciar bancos
scripts\docker-dev.bat logs      # Ver logs
scripts\docker-dev.bat shell-db  # Conectar ao PostgreSQL
```

**Linux/Mac:**
```bash
# Ver comandos disponíveis
./scripts/docker-dev.sh

# Exemplos de uso
./scripts/docker-dev.sh start     # Iniciar bancos
./scripts/docker-dev.sh logs      # Ver logs
./scripts/docker-dev.sh shell-db  # Conectar ao PostgreSQL
```

## 📁 Estrutura de Volumes

```
volumes/
├── postgres_data/          # Dados PostgreSQL (produção)
├── postgres_dev_data/      # Dados PostgreSQL (desenvolvimento)
├── redis_data/             # Dados Redis (produção)
└── redis_dev_data/         # Dados Redis (desenvolvimento)
```

## 🔧 Configuração de Ambiente

### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://laudo_user:laudo_password@localhost:5433/laudo_db_dev"

# JWT
JWT_SECRET="development-jwt-secret-key-change-in-production"
JWT_EXPIRES_IN="8h"

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Redis
REDIS_URL="redis://localhost:6379"

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH="./uploads"
```

### Frontend (.env)
```env
# API Configuration
VITE_API_URL=http://localhost:5000/api
VITE_API_TIMEOUT=10000

# Application Configuration
VITE_APP_NAME="Sistema de Laudos Térmicos"
VITE_APP_VERSION=1.0.0

# File Upload Configuration
VITE_MAX_FILE_SIZE=10485760
VITE_ACCEPTED_FILE_TYPES=.xls,.xlsx,.csv
```

## 🔍 Monitoramento e Logs

### Visualizar Logs
```bash
# Logs de todos os serviços
docker-compose logs -f

# Logs de um serviço específico
docker-compose logs -f postgres
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Health Checks
```bash
# Verificar status dos containers
docker-compose ps

# Verificar saúde dos serviços
docker-compose exec backend wget -qO- http://localhost:5000/api/health
```

## 🗄️ Gerenciamento do Banco de Dados

### Conectar ao PostgreSQL
```bash
# Via Docker
docker exec -it laudo-postgres-dev psql -U laudo_user -d laudo_db_dev

# Via cliente local (se instalado)
psql -h localhost -p 5433 -U laudo_user -d laudo_db_dev
```

### Comandos Prisma
```bash
cd backend

# Gerar cliente Prisma
npm run db:generate

# Aplicar schema ao banco
npm run db:push

# Executar migrações
npm run db:migrate

# Abrir Prisma Studio
npm run db:studio

# Popular banco com dados iniciais
npm run db:seed
```

### Conectar ao Redis
```bash
# Via Docker
docker exec -it laudo-redis-dev redis-cli

# Comandos úteis no Redis
redis-cli> KEYS *           # Listar todas as chaves
redis-cli> FLUSHALL         # Limpar todos os dados
redis-cli> INFO             # Informações do servidor
```

## 🚨 Solução de Problemas

### Problemas Comuns

**1. Porta já em uso**
```bash
# Verificar processos usando a porta
netstat -ano | findstr :5432  # Windows
lsof -i :5432                 # Linux/Mac

# Parar containers conflitantes
docker-compose down
```

**2. Volumes corrompidos**
```bash
# Resetar volumes (CUIDADO: apaga todos os dados)
docker-compose down -v
docker volume prune
```

**3. Problemas de permissão (Linux/Mac)**
```bash
# Ajustar permissões dos scripts
chmod +x scripts/*.sh

# Verificar propriedade dos volumes
sudo chown -R $USER:$USER ./volumes/
```

**4. Erro de conexão com banco**
```bash
# Verificar se o container está rodando
docker-compose ps

# Verificar logs do PostgreSQL
docker-compose logs postgres

# Testar conexão
docker exec laudo-postgres-dev pg_isready -U laudo_user
```

### Limpeza Completa

```bash
# Parar todos os containers
docker-compose down
docker-compose -f docker-compose.dev.yml down

# Remover volumes (CUIDADO: apaga todos os dados)
docker-compose down -v
docker-compose -f docker-compose.dev.yml down -v

# Remover imagens (opcional)
docker rmi $(docker images -q sistema-laudo-termico*)

# Limpeza geral do Docker
docker system prune -a
```

## 📚 Recursos Adicionais

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)
- [Prisma Documentation](https://www.prisma.io/docs/)

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs: `docker-compose logs -f`
2. Verifique o status: `docker-compose ps`
3. Consulte este documento
4. Reinicie os serviços: `docker-compose restart`
5. Em último caso, reset completo: `docker-compose down -v && docker-compose up -d`