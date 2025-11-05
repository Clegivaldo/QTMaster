#!/bin/bash

# Sistema de Laudos Térmicos - Maintenance Script
# This script performs routine maintenance tasks

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Starting maintenance tasks at $(date)"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Check if services are running
check_services() {
    log "Checking service health..."
    
    # Check if containers are running
    if ! docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" ps | grep -q "Up"; then
        log "ERROR: Some services are not running"
        docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" ps
        return 1
    fi
    
    # Health check endpoints
    if ! curl -f -s http://localhost/health > /dev/null; then
        log "ERROR: Application health check failed"
        return 1
    fi
    
    log "All services are healthy"
}

# Clean up Docker resources
cleanup_docker() {
    log "Cleaning up Docker resources..."
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    # Remove unused networks
    docker network prune -f
    
    log "Docker cleanup completed"
}

# Database maintenance
database_maintenance() {
    log "Performing database maintenance..."
    
    # Run VACUUM and ANALYZE on PostgreSQL
    docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec -T postgres \
        psql -U "${POSTGRES_USER:-laudo_user}" -d "${POSTGRES_DB:-laudo_db}" \
        -c "VACUUM ANALYZE;"
    
    # Update table statistics
    docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec -T postgres \
        psql -U "${POSTGRES_USER:-laudo_user}" -d "${POSTGRES_DB:-laudo_db}" \
        -c "ANALYZE;"
    
    log "Database maintenance completed"
}

# Log rotation
rotate_logs() {
    log "Rotating application logs..."
    
    # Rotate application logs
    find "$PROJECT_DIR/logs" -name "*.log" -size +100M -exec gzip {} \;
    find "$PROJECT_DIR/logs" -name "*.log.gz" -mtime +30 -delete
    
    # Rotate Docker logs
    docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" logs --tail=0 > /dev/null
    
    log "Log rotation completed"
}

# Update SSL certificates (if using Let's Encrypt)
update_ssl() {
    if [ -f "/etc/letsencrypt/live/yourdomain.com/fullchain.pem" ]; then
        log "Updating SSL certificates..."
        
        # Renew certificates
        certbot renew --quiet
        
        # Reload nginx if certificates were renewed
        if [ $? -eq 0 ]; then
            docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec nginx nginx -s reload
            log "SSL certificates updated and nginx reloaded"
        fi
    else
        log "No SSL certificates found, skipping update"
    fi
}

# Backup data
backup_data() {
    log "Creating backup..."
    
    if [ -f "$SCRIPT_DIR/backup.sh" ]; then
        bash "$SCRIPT_DIR/backup.sh"
    else
        log "Backup script not found, skipping backup"
    fi
}

# Check disk space
check_disk_space() {
    log "Checking disk space..."
    
    # Check if disk usage is above 80%
    DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$DISK_USAGE" -gt 80 ]; then
        log "WARNING: Disk usage is at ${DISK_USAGE}%"
        
        # Clean up old backups if disk is full
        if [ "$DISK_USAGE" -gt 90 ]; then
            log "Cleaning up old backups due to high disk usage"
            find "$PROJECT_DIR/backups" -name "*.enc" -type f -mtime +7 -delete
        fi
    else
        log "Disk usage is at ${DISK_USAGE}% - OK"
    fi
}

# Update application (if needed)
update_application() {
    log "Checking for application updates..."
    
    cd "$PROJECT_DIR"
    
    # Check if there are new commits
    git fetch origin
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)
    
    if [ "$LOCAL" != "$REMOTE" ]; then
        log "New updates available, but not auto-updating in production"
        log "Please review changes and update manually"
    else
        log "Application is up to date"
    fi
}

# Performance monitoring
performance_check() {
    log "Checking system performance..."
    
    # Check memory usage
    MEMORY_USAGE=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
    log "Memory usage: ${MEMORY_USAGE}%"
    
    # Check CPU load
    CPU_LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    log "CPU load average: $CPU_LOAD"
    
    # Check container resource usage
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
}

# Main execution
main() {
    case "${1:-all}" in
        "health")
            check_services
            ;;
        "cleanup")
            cleanup_docker
            ;;
        "database")
            database_maintenance
            ;;
        "logs")
            rotate_logs
            ;;
        "ssl")
            update_ssl
            ;;
        "backup")
            backup_data
            ;;
        "disk")
            check_disk_space
            ;;
        "update")
            update_application
            ;;
        "performance")
            performance_check
            ;;
        "all")
            check_services
            check_disk_space
            database_maintenance
            rotate_logs
            cleanup_docker
            backup_data
            update_ssl
            performance_check
            ;;
        *)
            echo "Usage: $0 [health|cleanup|database|logs|ssl|backup|disk|update|performance|all]"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"

log "Maintenance tasks completed at $(date)"