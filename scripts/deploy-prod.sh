#!/bin/bash

# Sistema de Laudos Térmicos - Production Deployment Script
# This script deploys the application to production

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log with timestamp and color
log() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] $message${NC}"
}

log_info() {
    log "$GREEN" "$1"
}

log_warn() {
    log "$YELLOW" "$1"
}

log_error() {
    log "$RED" "$1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    log_error "Do not run this script as root"
    exit 1
fi

# Check if .env.prod exists
if [ ! -f "$PROJECT_DIR/.env.prod" ]; then
    log_error ".env.prod file not found. Please create it from .env.prod.example"
    exit 1
fi

# Load environment variables
set -a
source "$PROJECT_DIR/.env.prod"
set +a

log_info "Starting production deployment..."

# Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed"
    exit 1
fi

# Check if ports are available
if netstat -tlnp | grep -q ":80 "; then
    log_warn "Port 80 is already in use"
fi

if netstat -tlnp | grep -q ":443 "; then
    log_warn "Port 443 is already in use"
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    log_warn "Disk usage is at ${DISK_USAGE}%. Consider freeing up space."
fi

# Create necessary directories
log_info "Creating necessary directories..."
mkdir -p "$PROJECT_DIR/logs"
mkdir -p "$PROJECT_DIR/backups"
mkdir -p "$PROJECT_DIR/ssl"

# Set proper permissions
chmod +x "$PROJECT_DIR/scripts"/*.sh

# Pull latest changes (if in git repository)
if [ -d "$PROJECT_DIR/.git" ]; then
    log_info "Pulling latest changes..."
    cd "$PROJECT_DIR"
    git pull origin main
fi

# Build and start services
log_info "Building and starting services..."
cd "$PROJECT_DIR"

# Stop existing services
docker-compose -f docker-compose.prod.yml down

# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Build custom images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
log_info "Waiting for services to start..."
sleep 30

# Check service health
log_info "Checking service health..."
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s http://localhost/health > /dev/null; then
        log_info "Application is healthy"
        break
    else
        log_warn "Application not ready yet, retrying in 10 seconds..."
        sleep 10
        RETRY_COUNT=$((RETRY_COUNT + 1))
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_error "Application failed to start properly"
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi

# Run database migrations
log_info "Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

# Setup cron jobs
log_info "Setting up cron jobs..."
CRON_FILE="/tmp/laudo-cron"

cat > "$CRON_FILE" << EOF
# Sistema de Laudos Térmicos - Automated Tasks

# Daily backup at 2 AM
0 2 * * * $PROJECT_DIR/scripts/backup.sh >> /var/log/backup.log 2>&1

# Daily maintenance at 3 AM
0 3 * * * $PROJECT_DIR/scripts/maintenance.sh >> /var/log/maintenance.log 2>&1

# Weekly full maintenance on Sundays at 4 AM
0 4 * * 0 $PROJECT_DIR/scripts/maintenance.sh all >> /var/log/maintenance.log 2>&1

# SSL certificate renewal (if using Let's Encrypt)
0 0,12 * * * /usr/bin/certbot renew --quiet && docker-compose -f $PROJECT_DIR/docker-compose.prod.yml exec nginx nginx -s reload
EOF

crontab "$CRON_FILE"
rm "$CRON_FILE"

# Setup log rotation
log_info "Setting up log rotation..."
sudo tee /etc/logrotate.d/laudo-termico > /dev/null << EOF
$PROJECT_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        docker-compose -f $PROJECT_DIR/docker-compose.prod.yml restart backend frontend
    endscript
}

/var/log/backup.log {
    weekly
    missingok
    rotate 12
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}

/var/log/maintenance.log {
    weekly
    missingok
    rotate 12
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF

# Create initial backup
log_info "Creating initial backup..."
"$PROJECT_DIR/scripts/backup.sh"

# Display deployment summary
log_info "Deployment completed successfully!"
echo
echo "=== Deployment Summary ==="
echo "Application URL: ${FRONTEND_URL:-http://localhost}"
echo "Health Check: http://localhost/health"
echo "Grafana: http://localhost:3001 (admin/${GRAFANA_PASSWORD})"
echo "Prometheus: http://localhost:9090"
echo
echo "=== Service Status ==="
docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" ps
echo
echo "=== Next Steps ==="
echo "1. Configure your domain DNS to point to this server"
echo "2. Set up SSL certificates if not already done"
echo "3. Configure monitoring alerts in Grafana"
echo "4. Test the application thoroughly"
echo "5. Set up external backup storage (S3) if desired"
echo
echo "=== Important Files ==="
echo "- Environment: $PROJECT_DIR/.env.prod"
echo "- Logs: $PROJECT_DIR/logs/"
echo "- Backups: $PROJECT_DIR/backups/"
echo "- Documentation: $PROJECT_DIR/docs/DEPLOYMENT.md"
echo
log_info "Deployment script completed at $(date)"