#!/bin/bash

# Sistema de Laudos Térmicos - Restore Script
# This script restores encrypted backups

set -euo pipefail

# Check if timestamp is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <timestamp> [--force]"
    echo "Available backups:"
    ls -la /opt/laudo-termico/backups/manifest_*.json 2>/dev/null | awk '{print $9}' | sed 's/.*manifest_\(.*\)\.json/\1/' || echo "No backups found"
    exit 1
fi

TIMESTAMP="$1"
FORCE_RESTORE="${2:-}"
BACKUP_DIR="/opt/laudo-termico/backups"
TEMP_DIR="/tmp/restore_$TIMESTAMP"

# Environment variables
DB_NAME="${POSTGRES_DB:-laudo_db}"
DB_USER="${POSTGRES_USER:-laudo_user}"
DB_PASSWORD="${POSTGRES_PASSWORD}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"

# Safety check
if [ "$FORCE_RESTORE" != "--force" ]; then
    echo "WARNING: This will overwrite the current database and files!"
    echo "Make sure to create a backup before proceeding."
    echo "Use --force flag to proceed: $0 $TIMESTAMP --force"
    exit 1
fi

# Check if backup exists
if [ ! -f "$BACKUP_DIR/manifest_$TIMESTAMP.json" ]; then
    echo "Error: Backup manifest for timestamp $TIMESTAMP not found"
    exit 1
fi

echo "Starting restore process for backup $TIMESTAMP at $(date)"

# Create temporary directory
mkdir -p "$TEMP_DIR"

# Restore database
echo "Restoring database..."
if [ -f "$BACKUP_DIR/db_backup_$TIMESTAMP.dump.gz.enc" ]; then
    # Decrypt and decompress database backup
    openssl enc -aes-256-cbc -d -pbkdf2 -iter 100000 \
        -in "$BACKUP_DIR/db_backup_$TIMESTAMP.dump.gz.enc" \
        -out "$TEMP_DIR/db_backup.dump.gz" \
        -k "$ENCRYPTION_KEY"
    
    gunzip "$TEMP_DIR/db_backup.dump.gz"
    
    # Drop existing database and recreate
    echo "Dropping and recreating database..."
    PGPASSWORD="$DB_PASSWORD" dropdb -h postgres -U "$DB_USER" "$DB_NAME" --if-exists
    PGPASSWORD="$DB_PASSWORD" createdb -h postgres -U "$DB_USER" "$DB_NAME"
    
    # Restore database
    PGPASSWORD="$DB_PASSWORD" pg_restore \
        -h postgres \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-owner \
        --no-privileges \
        "$TEMP_DIR/db_backup.dump"
    
    echo "Database restored successfully"
else
    echo "Warning: Database backup file not found"
fi

# Restore uploads
echo "Restoring uploads..."
if [ -f "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz.enc" ]; then
    # Decrypt uploads backup
    openssl enc -aes-256-cbc -d -pbkdf2 -iter 100000 \
        -in "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz.enc" \
        -out "$TEMP_DIR/uploads_backup.tar.gz" \
        -k "$ENCRYPTION_KEY"
    
    # Remove existing uploads and restore
    rm -rf /app/uploads/*
    tar -xzf "$TEMP_DIR/uploads_backup.tar.gz" -C /app/
    
    echo "Uploads restored successfully"
else
    echo "Warning: Uploads backup file not found"
fi

# Restore templates
echo "Restoring templates..."
if [ -f "$BACKUP_DIR/templates_backup_$TIMESTAMP.tar.gz.enc" ]; then
    # Decrypt templates backup
    openssl enc -aes-256-cbc -d -pbkdf2 -iter 100000 \
        -in "$BACKUP_DIR/templates_backup_$TIMESTAMP.tar.gz.enc" \
        -out "$TEMP_DIR/templates_backup.tar.gz" \
        -k "$ENCRYPTION_KEY"
    
    # Remove existing templates and restore
    rm -rf /app/templates/*
    tar -xzf "$TEMP_DIR/templates_backup.tar.gz" -C /app/
    
    echo "Templates restored successfully"
else
    echo "Warning: Templates backup file not found"
fi

# Clean up temporary files
rm -rf "$TEMP_DIR"

# Run database migrations to ensure schema is up to date
echo "Running database migrations..."
cd /opt/laudo-termico
docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

echo "Restore completed successfully at $(date)"
echo "Please restart the application to ensure all changes take effect."