#!/bin/bash

# Sistema de Laudos Térmicos - Backup Script
# This script creates encrypted backups of the database and uploads

set -euo pipefail

# Configuration
BACKUP_DIR="/opt/laudo-termico/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

# Environment variables
DB_NAME="${POSTGRES_DB:-laudo_db}"
DB_USER="${POSTGRES_USER:-laudo_user}"
DB_PASSWORD="${POSTGRES_PASSWORD}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"

# S3 Configuration (optional)
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_REGION="${BACKUP_S3_REGION:-us-east-1}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Starting backup process at $(date)"

# Database backup
echo "Creating database backup..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h postgres \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --no-owner \
    --no-privileges \
    --format=custom \
    > "$BACKUP_DIR/db_backup_$TIMESTAMP.dump"

# Compress and encrypt database backup
echo "Compressing and encrypting database backup..."
gzip "$BACKUP_DIR/db_backup_$TIMESTAMP.dump"
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
    -in "$BACKUP_DIR/db_backup_$TIMESTAMP.dump.gz" \
    -out "$BACKUP_DIR/db_backup_$TIMESTAMP.dump.gz.enc" \
    -k "$ENCRYPTION_KEY"
rm "$BACKUP_DIR/db_backup_$TIMESTAMP.dump.gz"

# Backup uploads directory
echo "Creating uploads backup..."
if [ -d "/app/uploads" ] && [ "$(ls -A /app/uploads)" ]; then
    tar -czf "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz" -C /app uploads/
    
    # Encrypt uploads backup
    openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
        -in "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz" \
        -out "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz.enc" \
        -k "$ENCRYPTION_KEY"
    rm "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz"
else
    echo "No uploads to backup"
fi

# Backup templates directory
echo "Creating templates backup..."
if [ -d "/app/templates" ] && [ "$(ls -A /app/templates)" ]; then
    tar -czf "$BACKUP_DIR/templates_backup_$TIMESTAMP.tar.gz" -C /app templates/
    
    # Encrypt templates backup
    openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
        -in "$BACKUP_DIR/templates_backup_$TIMESTAMP.tar.gz" \
        -out "$BACKUP_DIR/templates_backup_$TIMESTAMP.tar.gz.enc" \
        -k "$ENCRYPTION_KEY"
    rm "$BACKUP_DIR/templates_backup_$TIMESTAMP.tar.gz"
else
    echo "No templates to backup"
fi

# Upload to S3 if configured
if [ -n "$S3_BUCKET" ]; then
    echo "Uploading backups to S3..."
    aws s3 cp "$BACKUP_DIR/" "s3://$S3_BUCKET/backups/$(date +%Y/%m/%d)/" \
        --recursive \
        --exclude "*" \
        --include "*_$TIMESTAMP.*" \
        --region "$S3_REGION"
fi

# Clean up old backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "*.enc" -type f -mtime +$RETENTION_DAYS -delete

# Create backup manifest
echo "Creating backup manifest..."
cat > "$BACKUP_DIR/manifest_$TIMESTAMP.json" << EOF
{
    "timestamp": "$TIMESTAMP",
    "date": "$(date -Iseconds)",
    "database": {
        "name": "$DB_NAME",
        "file": "db_backup_$TIMESTAMP.dump.gz.enc",
        "size": "$(stat -f%z "$BACKUP_DIR/db_backup_$TIMESTAMP.dump.gz.enc" 2>/dev/null || stat -c%s "$BACKUP_DIR/db_backup_$TIMESTAMP.dump.gz.enc")"
    },
    "uploads": {
        "file": "uploads_backup_$TIMESTAMP.tar.gz.enc",
        "size": "$(stat -f%z "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz.enc" 2>/dev/null || stat -c%s "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz.enc" 2>/dev/null || echo "0")"
    },
    "templates": {
        "file": "templates_backup_$TIMESTAMP.tar.gz.enc",
        "size": "$(stat -f%z "$BACKUP_DIR/templates_backup_$TIMESTAMP.tar.gz.enc" 2>/dev/null || stat -c%s "$BACKUP_DIR/templates_backup_$TIMESTAMP.tar.gz.enc" 2>/dev/null || echo "0")"
    },
    "retention_days": $RETENTION_DAYS
}
EOF

echo "Backup completed successfully at $(date)"
echo "Backup files:"
ls -la "$BACKUP_DIR"/*_$TIMESTAMP.*