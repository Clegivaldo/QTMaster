# Sistema de Laudos Térmicos - Production Deployment

## Quick Start

### Prerequisites
- Ubuntu 20.04+ server
- Docker & Docker Compose
- 4GB+ RAM, 50GB+ storage
- Domain name (optional but recommended)

### 1. Clone and Setup
```bash
git clone https://github.com/your-org/sistema-laudo-termico.git
cd sistema-laudo-termico
cp .env.prod.example .env.prod
```

### 2. Configure Environment
Edit `.env.prod` with your production values:
```bash
nano .env.prod
```

### 3. Deploy
```bash
chmod +x scripts/*.sh
./scripts/deploy-prod.sh
```

### 4. Verify Deployment
```bash
./scripts/health-check.sh
```

## Access Points

- **Application**: http://your-domain.com
- **Health Check**: http://your-domain.com/health
- **Grafana**: http://your-domain.com:3001
- **Prometheus**: http://your-domain.com:9090

## Management Commands

```bash
# Health check
./scripts/health-check.sh

# Manual backup
./scripts/backup.sh

# Maintenance tasks
./scripts/maintenance.sh

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Update application
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

## Monitoring

- **Grafana Dashboard**: http://localhost:3001 (admin/your-password)
- **Prometheus Metrics**: http://localhost:9090
- **Application Logs**: `docker-compose logs`
- **System Logs**: `/var/log/`

## Backup & Recovery

### Automated Backups
- Daily backups at 2 AM (configured via cron)
- Encrypted with AES-256
- 30-day retention policy
- Optional S3 upload

### Manual Backup
```bash
./scripts/backup.sh
```

### Restore from Backup
```bash
# List available backups
./scripts/restore.sh

# Restore specific backup
./scripts/restore.sh 20240101_020000 --force
```

## Security Features

- ✅ HTTPS/SSL encryption
- ✅ JWT authentication with refresh tokens
- ✅ Rate limiting
- ✅ Security headers
- ✅ Container security (non-root users)
- ✅ Encrypted backups
- ✅ Firewall configuration
- ✅ Input validation

## Performance Optimizations

- ✅ Nginx reverse proxy with caching
- ✅ Gzip compression
- ✅ Redis caching
- ✅ Database connection pooling
- ✅ Optimized Docker images
- ✅ Resource limits

## Troubleshooting

### Common Issues

**Services not starting:**
```bash
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs
```

**Database connection issues:**
```bash
docker-compose -f docker-compose.prod.yml exec postgres pg_isready
```

**High resource usage:**
```bash
docker stats
./scripts/maintenance.sh performance
```

### Log Locations
- Application: `logs/`
- Docker: `docker-compose logs`
- System: `/var/log/`
- Nginx: `/var/log/nginx/`

## Support

For detailed documentation, see:
- [Deployment Guide](docs/DEPLOYMENT.md)
- [System Requirements](docs/REQUIREMENTS.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

## Architecture

```
Internet → Nginx → Frontend (React)
              ↓
              API → Backend (Node.js) → PostgreSQL
                         ↓
                    Redis Cache
```

## Monitoring Stack

```
Application → Prometheus → Grafana
     ↓
   Loki ← Promtail
```

---

**Important**: Always test deployments in a staging environment first!