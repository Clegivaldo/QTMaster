#!/bin/bash

# Sistema de Laudos Térmicos - Health Check Script
# This script performs comprehensive health checks

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log with timestamp and color
log() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] $message${NC}"
}

log_info() {
    log "$BLUE" "INFO: $1"
}

log_success() {
    log "$GREEN" "SUCCESS: $1"
}

log_warn() {
    log "$YELLOW" "WARNING: $1"
}

log_error() {
    log "$RED" "ERROR: $1"
}

# Health check results
HEALTH_STATUS=0
CHECKS_PASSED=0
CHECKS_TOTAL=0

# Function to run a health check
run_check() {
    local check_name="$1"
    local check_command="$2"
    local is_critical="${3:-true}"
    
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
    log_info "Running check: $check_name"
    
    if eval "$check_command" > /dev/null 2>&1; then
        log_success "$check_name"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        return 0
    else
        if [ "$is_critical" = "true" ]; then
            log_error "$check_name"
            HEALTH_STATUS=1
        else
            log_warn "$check_name"
        fi
        return 1
    fi
}

# Function to check HTTP endpoint
check_http() {
    local url="$1"
    local expected_status="${2:-200}"
    curl -f -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"
}

# Function to check database connection
check_database() {
    docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "${POSTGRES_USER:-laudo_user}" -d "${POSTGRES_DB:-laudo_db}"
}

# Function to check Redis connection
check_redis() {
    docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping | grep -q "PONG"
}

# Function to check container health
check_container() {
    local container_name="$1"
    docker ps --filter "name=$container_name" --filter "status=running" | grep -q "$container_name"
}

# Function to check disk space
check_disk_space() {
    local threshold="${1:-90}"
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    [ "$usage" -lt "$threshold" ]
}

# Function to check memory usage
check_memory() {
    local threshold="${1:-90}"
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    [ "$usage" -lt "$threshold" ]
}

# Function to check load average
check_load() {
    local threshold="${1:-5.0}"
    local load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    awk -v load="$load" -v threshold="$threshold" 'BEGIN {exit (load < threshold) ? 0 : 1}'
}

echo "========================================"
echo "Sistema de Laudos Térmicos - Health Check"
echo "========================================"
echo "Started at: $(date)"
echo

# System checks
log_info "=== System Health Checks ==="
run_check "Disk space usage (<90%)" "check_disk_space 90"
run_check "Memory usage (<90%)" "check_memory 90"
run_check "CPU load average (<5.0)" "check_load 5.0"

# Docker checks
log_info "=== Docker Container Checks ==="
run_check "Nginx container running" "check_container laudo-nginx"
run_check "Backend container running" "check_container laudo-backend"
run_check "Frontend container running" "check_container laudo-frontend"
run_check "PostgreSQL container running" "check_container laudo-postgres"
run_check "Redis container running" "check_container laudo-redis"

# Service checks
log_info "=== Service Health Checks ==="
run_check "Database connection" "check_database"
run_check "Redis connection" "check_redis"
run_check "Application health endpoint" "check_http http://localhost/health"
run_check "API health endpoint" "check_http http://localhost/api/health"

# Application-specific checks
log_info "=== Application Checks ==="
run_check "Frontend loading" "check_http http://localhost/"
run_check "API authentication endpoint" "check_http http://localhost/api/auth/me 401"

# Monitoring checks (non-critical)
log_info "=== Monitoring Checks ==="
run_check "Prometheus metrics" "check_http http://localhost:9090/-/healthy" false
run_check "Grafana dashboard" "check_http http://localhost:3001/api/health" false

# File system checks
log_info "=== File System Checks ==="
run_check "Uploads directory writable" "[ -w /opt/sistema-laudo-termico/uploads ]" false
run_check "Logs directory writable" "[ -w /opt/sistema-laudo-termico/logs ]" false
run_check "Backups directory exists" "[ -d /opt/sistema-laudo-termico/backups ]" false

# Security checks
log_info "=== Security Checks ==="
run_check "Firewall is active" "sudo ufw status | grep -q 'Status: active'" false
run_check "SSL certificate exists" "[ -f /opt/sistema-laudo-termico/ssl/cert.pem ]" false

# Performance checks
log_info "=== Performance Checks ==="

# Check response times
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost/health)
if awk -v rt="$RESPONSE_TIME" 'BEGIN {exit (rt < 2.0) ? 0 : 1}'; then
    run_check "Response time (<2s): ${RESPONSE_TIME}s" "true"
else
    run_check "Response time (<2s): ${RESPONSE_TIME}s" "false" false
fi

# Check database performance
DB_CONNECTIONS=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql -U "${POSTGRES_USER:-laudo_user}" -d "${POSTGRES_DB:-laudo_db}" -t -c "SELECT count(*) FROM pg_stat_activity;" | xargs)
if [ "$DB_CONNECTIONS" -lt 50 ]; then
    run_check "Database connections ($DB_CONNECTIONS < 50)" "true"
else
    run_check "Database connections ($DB_CONNECTIONS < 50)" "false" false
fi

# Summary
echo
echo "========================================"
echo "Health Check Summary"
echo "========================================"
echo "Checks passed: $CHECKS_PASSED/$CHECKS_TOTAL"
echo "Overall status: $([ $HEALTH_STATUS -eq 0 ] && echo "HEALTHY" || echo "UNHEALTHY")"
echo "Completed at: $(date)"

# Additional system information
echo
echo "========================================"
echo "System Information"
echo "========================================"
echo "Uptime: $(uptime -p)"
echo "Load average: $(uptime | awk -F'load average:' '{print $2}')"
echo "Memory usage: $(free -h | awk 'NR==2{printf "%s/%s (%.2f%%)", $3,$2,$3*100/$2}')"
echo "Disk usage: $(df -h / | awk 'NR==2{printf "%s/%s (%s)", $3,$2,$5}')"

# Container resource usage
echo
echo "========================================"
echo "Container Resource Usage"
echo "========================================"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"

# Recent errors in logs (if any)
echo
echo "========================================"
echo "Recent Errors (Last 10)"
echo "========================================"
if [ -f "/opt/sistema-laudo-termico/logs/error.log" ]; then
    tail -n 10 /opt/sistema-laudo-termico/logs/error.log 2>/dev/null || echo "No recent errors found"
else
    echo "Error log not found"
fi

exit $HEALTH_STATUS