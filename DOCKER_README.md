# 🐳 Guia Docker - Sistema de Laudos

Sistema completo com Assinatura Digital e Compartilhamento Seguro rodando em containers Docker.

## 📋 Pré-requisitos

- Docker Desktop instalado e rodando
- Docker Compose (incluído no Docker Desktop)
- Mínimo 4GB RAM disponível
- Portas disponíveis: 3000, 5000, 5432, 6379

## 🚀 Início Rápido

### Windows (PowerShell)

```powershell
# Executar script automatizado
.\docker-start.ps1
```

### Linux/Mac (Bash)

```bash
# Tornar o script executável
chmod +x docker-start.sh

# Executar script automatizado
./docker-start.sh
```

### Manual

```bash
# 1. Criar diretórios necessários
mkdir -p backend/uploads/reports backend/templates backend/signatures backend/certificates

# 2. Build das imagens
docker-compose build

# 3. Iniciar containers
docker-compose up -d

# 4. Aguardar PostgreSQL (30 segundos)
sleep 30

# 5. Executar migrations
docker-compose exec backend npx prisma migrate deploy

# 6. Gerar Prisma Client
docker-compose exec backend npx prisma generate
```

## 🌐 URLs de Acesso

Após iniciar, o sistema estará disponível em:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health
- **Página Pública de Compartilhamento**: http://localhost:3000/shared/:token

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Frontend   │  │   Backend    │  │  PostgreSQL  │ │
│  │   (Nginx)    │  │  (Node.js)   │  │   (Database) │ │
│  │   Port 3000  │  │   Port 5000  │  │   Port 5432  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                            │                            │
│                     ┌──────────────┐                    │
│                     │    Redis     │                    │
│                     │   (Cache)    │                    │
│                     │   Port 6379  │                    │
│                     └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

## 📦 Containers

### Backend
- **Imagem**: Node.js 18 Alpine
- **Dependências**:
  - Chromium (para geração de PDF)
  - Puppeteer
  - Prisma ORM
- **Volumes**:
  - `uploads/` - Arquivos enviados
  - `templates/` - Templates de relatórios
  - `signatures/` - PDFs assinados
  - `certificates/` - Certificados digitais

### Frontend
- **Imagem**: Nginx Alpine
- **Build**: React/Vite
- **Configuração**: SPA com fallback

### PostgreSQL
- **Versão**: 15 Alpine
- **Banco**: laudo_db
- **User**: laudo_user
- **Volume**: Dados persistentes

### Redis
- **Versão**: 7 Alpine
- **Uso**: Cache de templates e sessões
- **Volume**: Dados persistentes

## 📝 Comandos Úteis

### Gerenciamento de Containers

```bash
# Ver status dos containers
docker-compose ps

# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs apenas do backend
docker-compose logs -f backend

# Ver logs apenas do frontend
docker-compose logs -f frontend

# Parar todos os containers
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados)
docker-compose down -v

# Reiniciar um serviço específico
docker-compose restart backend

# Rebuild de imagens
docker-compose build --no-cache
```

### Acesso aos Containers

```bash
# Acessar shell do backend
docker-compose exec backend sh

# Acessar shell do PostgreSQL
docker-compose exec postgres psql -U laudo_user -d laudo_db

# Acessar shell do Redis
docker-compose exec redis redis-cli
```

### Banco de Dados

```bash
# Executar migrations
docker-compose exec backend npx prisma migrate deploy

# Criar nova migration
docker-compose exec backend npx prisma migrate dev --name nome_da_migration

# Gerar Prisma Client
docker-compose exec backend npx prisma generate

# Abrir Prisma Studio (GUI do banco)
docker-compose exec backend npx prisma studio
```

### Manutenção

```bash
# Ver uso de espaço
docker system df

# Limpar containers parados
docker container prune

# Limpar imagens não usadas
docker image prune

# Limpar tudo (CUIDADO)
docker system prune -a
```

## 🔧 Configuração Avançada

### Variáveis de Ambiente

Edite `docker-compose.yml` para customizar:

```yaml
backend:
  environment:
    # Banco de Dados
    DATABASE_URL: postgresql://user:pass@postgres:5432/db
    
    # JWT
    JWT_SECRET: your-secret-key
    JWT_EXPIRES_IN: 8h
    
    # Redis
    REDIS_URL: redis://redis:6379
    
    # Puppeteer
    PUPPETEER_EXECUTABLE_PATH: /usr/bin/chromium-browser
    REPORT_GENERATION_TIMEOUT: 30000
    MAX_CONCURRENT_REPORTS: 5
    
    # Recursos Novos
    DEFAULT_LINK_EXPIRATION_HOURS: 24
    MAX_LINK_EXPIRATION_HOURS: 720
    CLEANUP_INTERVAL_MINUTES: 10
```

### Portas Customizadas

Para mudar as portas expostas, edite `docker-compose.yml`:

```yaml
backend:
  ports:
    - "5001:5000"  # Expor na porta 5001 ao invés de 5000

frontend:
  ports:
    - "8080:80"    # Expor na porta 8080 ao invés de 3000
```

### Recursos de Sistema

Para ajustar limites de memória/CPU:

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 512M
```

## 🔐 Segurança

### Produção

Para ambientes de produção, altere:

1. **Senhas**: Mude todas as senhas padrão
2. **JWT Secret**: Use segredo forte e único
3. **Volumes**: Use volumes nomeados para dados críticos
4. **Network**: Exponha apenas as portas necessárias
5. **HTTPS**: Configure reverse proxy (Nginx/Traefik)

### Backup

```bash
# Backup do banco de dados
docker-compose exec -T postgres pg_dump -U laudo_user laudo_db > backup_$(date +%Y%m%d).sql

# Backup de arquivos
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz backend/uploads backend/signatures

# Restaurar banco
docker-compose exec -T postgres psql -U laudo_user laudo_db < backup_20251114.sql
```

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver logs de erro
docker-compose logs backend

# Verificar healthcheck
docker inspect laudo-backend | grep -A 10 Health
```

### Migrations falham

```bash
# Reset do banco (CUIDADO: apaga dados)
docker-compose down -v
docker-compose up -d postgres
sleep 10
docker-compose up -d backend
docker-compose exec backend npx prisma migrate deploy
```

### Out of Memory

```bash
# Ver uso de recursos
docker stats

# Aumentar memória do Docker Desktop:
# Settings > Resources > Memory > 4GB+
```

### Porta já em uso

```bash
# Verificar quem está usando a porta
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000

# Matar processo ou mudar porta no docker-compose.yml
```

### Erros de Puppeteer/PDF

```bash
# Reinstalar Chromium no container
docker-compose exec backend apk add --no-cache chromium

# Verificar variável de ambiente
docker-compose exec backend env | grep PUPPETEER
```

## 📊 Monitoramento

### Health Checks

Todos os serviços têm health checks configurados:

```bash
# Verificar saúde dos containers
docker-compose ps

# Ver detalhes do health check
docker inspect laudo-backend | grep -A 20 Health
```

### Logs Estruturados

Os logs seguem formato JSON para fácil parsing:

```bash
# Filtrar logs de erro
docker-compose logs backend | grep '"level":"error"'

# Logs de acesso compartilhado
docker-compose logs backend | grep 'SharedLink'
```

## 🚀 Deploy em Produção

### Docker Swarm

```bash
# Iniciar swarm
docker swarm init

# Deploy
docker stack deploy -c docker-compose.prod.yml laudo-stack

# Ver serviços
docker service ls

# Escalar backend
docker service scale laudo-stack_backend=3
```

### Kubernetes

Use os arquivos em `k8s/` (se disponíveis) ou converta:

```bash
# Converter docker-compose para kubernetes
kompose convert -f docker-compose.yml
```

## 📚 Recursos Adicionais

- [Docker Docs](https://docs.docker.com/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Prisma with Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel#containerizing-the-application)
- [Puppeteer in Docker](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker)

## 🆘 Suporte

Em caso de problemas:

1. Verifique os logs: `docker-compose logs -f`
2. Teste health checks: `curl http://localhost:5000/api/health`
3. Verifique conectividade: `docker-compose exec backend ping postgres`
4. Consulte a documentação: `SISTEMA_ASSINATURA_COMPARTILHAMENTO.md`

---

**Última atualização:** 14/11/2025  
**Versão:** 1.0.0
