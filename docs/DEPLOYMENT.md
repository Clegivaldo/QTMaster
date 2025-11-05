# Deployment Guide - Sistema de Laudos Térmicos

## Overview

This guide covers the deployment of the Sistema de Laudos Térmicos to production environments using Docker containers, monitoring, and automated backups.

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04 LTS or newer (recommended)
- **CPU**: Minimum 2 cores, recommended 4+ cores
- **RAM**: Minimum 4GB, recommended 8GB+
- **Storage**: Minimum 50GB SSD, recommended 100GB+ SSD
- **Network**: Stable internet connection with static IP

### Software Requirements

- Docker Engine 24.0+
- Docker Compose 2.0+
- Git
- OpenSSL
- Curl/Wget
- Cron (for scheduled tasks)

### Optional Requirements

- AWS CLI (for S3 backups)
- Certbot (for SSL certificates)
- Fail2ban (for security)

## Installation

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y git curl wget openssl cron fail2ban ufw

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply Docker group changes
```

### 2. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. Application Deployment

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/your-org/sistema-laudo-termico.git
sudo chown -R $USER:$USER sistema-laudo-termico
cd sistema-laudo-termico

# Create environment file
cp .env.prod.example .env.prod

# Edit environment variables (IMPORTANT!)
nano .env.prod
```

### 4. Environment Configuration

Edit `.env.prod` with your production values:

```bash
# Database Configuration
POSTGRES_DB=laudo_db
POSTGRES_USER=laudo_user
POSTGRES_PASSWORD=your-super-secure-postgres-password

# Redis Configuration
REDIS_PASSWORD=your-super-secure-redis-password

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-at-least-32-characters
JWT_REFRESH_SECRET=your-super-secure-jwt-refresh-secret-key-at-least-32-characters

# Application Configuration
FRONTEND_URL=https://yourdomain.com
VITE_API_URL=/api

# FastReport Configuration
FASTREPORT_LICENSE=your-fastreport-license-key

# Backup Configuration
BACKUP_ENCRYPTION_KEY=your-backup-encryption-key-32-chars

# Monitoring Configuration
GRAFANA_PASSWORD=your-grafana-admin-password
```

### 5. SSL Certificate Setup (Optional but Recommended)

#### Using Let's Encrypt:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com

# Create SSL directory
mkdir -p ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/private.key
sudo chown -R $USER:$USER ssl/
```

### 6. Deploy Application

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
sleep 30

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Check service health
curl -f http://localhost/health
```

## Configuration

### Nginx Configuration

The production setup includes an Nginx reverse proxy with the following features:

- SSL termination
- Rate limiting
- Security headers
- Gzip compression
- Static file caching

### Database Configuration

PostgreSQL is configured with:

- Optimized settings for performance
- Connection pooling
- Automated backups
- Health checks

### Redis Configuration

Redis is configured with:

- Password authentication
- Memory optimization
- Persistence enabled
- Health monitoring

### Monitoring Stack

The deployment includes:

- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **Loki**: Log aggregation
- **Promtail**: Log collection

Access monitoring:
- Grafana: http://localhost:3001 (admin/your-grafana-password)
- Prometheus: http://localhost:9090

## Backup and Recovery

### Automated Backups

Backups are automatically created and include:

- PostgreSQL database dump
- Uploaded files
- FastReport templates
- Configuration files

#### Setup Automated Backups

```bash
# Add to crontab
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * /opt/sistema-laudo-termico/scripts/backup.sh >> /var/log/backup.log 2>&1
```

#### Manual Backup

```bash
# Create manual backup
./scripts/backup.sh
```

### Recovery

```bash
# List available backups
./scripts/restore.sh

# Restore from backup (replace TIMESTAMP with actual timestamp)
./scripts/restore.sh 20240101_020000 --force
```

## Maintenance

### Routine Maintenance

```bash
# Run all maintenance tasks
./scripts/maintenance.sh

# Run specific maintenance task
./scripts/maintenance.sh database
./scripts/maintenance.sh cleanup
./scripts/maintenance.sh logs
```

### Scheduled Maintenance

Add to crontab:

```bash
# Daily maintenance at 3 AM
0 3 * * * /opt/sistema-laudo-termico/scripts/maintenance.sh >> /var/log/maintenance.log 2>&1

# Weekly full maintenance on Sundays at 4 AM
0 4 * * 0 /opt/sistema-laudo-termico/scripts/maintenance.sh all >> /var/log/maintenance.log 2>&1
```

## Updates

### Application Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### System Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring and Logging

### Application Logs

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend

# View all logs
docker-compose -f docker-compose.prod.yml logs -f
```

### System Monitoring

- **Health Checks**: Automated health checks for all services
- **Metrics**: CPU, memory, disk usage, and application metrics
- **Alerts**: Configure alerts in Grafana for critical issues
- **Log Analysis**: Centralized logging with Loki

### Performance Monitoring

```bash
# Check system performance
./scripts/maintenance.sh performance

# View container resource usage
docker stats
```

## Security

### Security Measures Implemented

- **Firewall**: UFW configured to allow only necessary ports
- **SSL/TLS**: HTTPS encryption for all communications
- **Authentication**: JWT-based authentication with refresh tokens
- **Rate Limiting**: API rate limiting to prevent abuse
- **Security Headers**: Comprehensive security headers
- **Container Security**: Non-root users in containers
- **Data Encryption**: Encrypted backups
- **Input Validation**: Server-side input validation

### Security Best Practices

1. **Regular Updates**: Keep system and dependencies updated
2. **Strong Passwords**: Use strong, unique passwords for all services
3. **Access Control**: Limit SSH access and use key-based authentication
4. **Monitoring**: Monitor logs for suspicious activity
5. **Backups**: Regular encrypted backups stored securely
6. **SSL Certificates**: Keep SSL certificates updated

## Troubleshooting

### Common Issues

#### Services Not Starting

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

#### Database Connection Issues

```bash
# Check database health
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Reset database connection
docker-compose -f docker-compose.prod.yml restart backend
```

#### High Resource Usage

```bash
# Check resource usage
docker stats

# Check disk space
df -h

# Clean up Docker resources
docker system prune -f
```

### Log Locations

- Application logs: `/opt/sistema-laudo-termico/logs/`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/`
- Docker logs: `docker-compose logs`

## Support

### Getting Help

1. Check application logs for error messages
2. Review this documentation
3. Check GitHub issues
4. Contact system administrator

### Reporting Issues

When reporting issues, include:

- Error messages from logs
- Steps to reproduce the issue
- System information
- Recent changes made to the system

## Appendix

### Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| POSTGRES_DB | Database name | Yes | laudo_db |
| POSTGRES_USER | Database user | Yes | laudo_user |
| POSTGRES_PASSWORD | Database password | Yes | - |
| REDIS_PASSWORD | Redis password | Yes | - |
| JWT_SECRET | JWT signing secret | Yes | - |
| JWT_REFRESH_SECRET | JWT refresh secret | Yes | - |
| FRONTEND_URL | Frontend URL | Yes | - |
| FASTREPORT_LICENSE | FastReport license | Yes | - |
| BACKUP_ENCRYPTION_KEY | Backup encryption key | Yes | - |
| GRAFANA_PASSWORD | Grafana admin password | Yes | - |

### Port Reference

| Service | Internal Port | External Port | Description |
|---------|---------------|---------------|-------------|
| Nginx | 80, 443 | 80, 443 | Web server |
| Backend | 5000 | - | API server |
| Frontend | 8080 | - | Web application |
| PostgreSQL | 5432 | 5432 | Database |
| Redis | 6379 | 6379 | Cache |
| Grafana | 3000 | 3001 | Monitoring |
| Prometheus | 9090 | 9090 | Metrics |

### Useful Commands

```bash
# View running containers
docker ps

# View container logs
docker logs <container_name>

# Execute command in container
docker exec -it <container_name> bash

# View system resources
htop

# Check network connectivity
netstat -tlnp

# Check disk usage
du -sh /opt/sistema-laudo-termico/*
```