#!/bin/bash
#
# Database Backup Script for Meta Chat Platform
#
# This script creates automated backups of the PostgreSQL database with:
# - Compressed backups with timestamps
# - Retention policy (default: 30 days)
# - Optional S3 upload for offsite storage
# - Email notifications on failure
# - Backup verification
#
# Usage:
#   ./scripts/backup-database.sh                    # Manual backup
#   ./scripts/backup-database.sh --verify-only      # Verify latest backup
#   ./scripts/backup-database.sh --cleanup-only     # Remove old backups
#   ./scripts/backup-database.sh --with-full-test   # Backup with full restoration test
#
# Cron setup:
#   Daily backup at 2 AM:
#     0 2 * * * /home/deploy/meta-chat-platform/scripts/backup-database.sh >> /var/log/metachat/backup.log 2>&1
#   Weekly full verification on Sunday at 3 AM:
#     0 3 * * 0 /home/deploy/meta-chat-platform/scripts/verify-backup.sh --weekly-full >> /var/log/metachat/verification.log 2>&1

set -euo pipefail

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_ROOT/.env.production" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env.production" | xargs)
fi

# Configuration
BACKUP_DIR="${DB_BACKUP_PATH:-/var/backups/metachat}"
RETENTION_DAYS="${DB_BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/metachat_backup_$TIMESTAMP.sql.gz"
LOG_FILE="/var/log/metachat/backup.log"
S3_ENABLED="${DB_BACKUP_S3_BUCKET:+true}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Send notification (optional)
send_notification() {
    local subject="$1"
    local message="$2"

    # Email notification (if SMTP is configured)
    if [ -n "${SMTP_HOST:-}" ] && [ "${SMTP_ENABLED:-false}" = "true" ]; then
        echo "$message" | mail -s "$subject" "${ADMIN_EMAIL:-root@localhost}"
    fi

    # Webhook notification (if configured)
    if [ -n "${BACKUP_ALERT_WEBHOOK:-}" ]; then
        curl -X POST "$BACKUP_ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"subject\":\"$subject\",\"message\":\"$message\"}" \
            2>/dev/null || true
    fi
}

# Parse DATABASE_URL
parse_database_url() {
    if [ -z "${DATABASE_URL:-}" ]; then
        error "DATABASE_URL not set in environment"
        exit 1
    fi

    # Extract connection details from DATABASE_URL
    # Format: postgresql://user:password@host:port/database
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

    export PGPASSWORD="$DB_PASSWORD"
}

# Create backup directory
setup_backup_dir() {
    log "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"

    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
}

# Perform database backup
backup_database() {
    log "========================================================================="
    log "Starting database backup"
    log "========================================================================="
    log "Backup file: $BACKUP_FILE"
    log "Database: $DB_NAME"
    log "Host: $DB_HOST"

    # Check if PostgreSQL client is installed
    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump not found. Please install postgresql-client."
        send_notification "Backup Failed" "pg_dump not found on server"
        exit 1
    fi

    # Create backup
    log "Creating database dump..."
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists | gzip > "$BACKUP_FILE"; then

        success "Database backup created successfully"

        # Get backup size
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log "Backup size: $BACKUP_SIZE"

    else
        error "Failed to create database backup"
        send_notification "Backup Failed" "Database backup failed for $DB_NAME"
        exit 1
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_to_verify="${1:-$BACKUP_FILE}"

    log "Verifying backup integrity: $(basename "$backup_to_verify")"

    # Check if file exists and is not empty
    if [ ! -f "$backup_to_verify" ]; then
        error "Backup file does not exist: $backup_to_verify"
        return 1
    fi

    if [ ! -s "$backup_to_verify" ]; then
        error "Backup file is empty: $backup_to_verify"
        return 1
    fi

    # Test gzip integrity
    if ! gzip -t "$backup_to_verify" 2>/dev/null; then
        error "Backup file is corrupted (gzip test failed)"
        return 1
    fi

    # Test SQL structure (basic check)
    if ! zcat "$backup_to_verify" | head -n 100 | grep -q "PostgreSQL database dump"; then
        error "Backup file does not appear to be a valid PostgreSQL dump"
        return 1
    fi

    success "Backup verification passed"
    return 0
}

# Upload to S3 (if configured)
upload_to_s3() {
    if [ -z "$S3_ENABLED" ]; then
        log "S3 upload disabled (DB_BACKUP_S3_BUCKET not set)"
        return 0
    fi

    log "Uploading backup to S3..."

    if ! command -v aws &> /dev/null; then
        warning "AWS CLI not installed, skipping S3 upload"
        return 0
    fi

    local s3_path="s3://${DB_BACKUP_S3_BUCKET}/backups/$(basename "$BACKUP_FILE")"

    if aws s3 cp "$BACKUP_FILE" "$s3_path" --region "${DB_BACKUP_S3_REGION:-us-east-1}"; then
        success "Backup uploaded to S3: $s3_path"
    else
        warning "Failed to upload backup to S3"
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."

    local deleted_count=0
    while IFS= read -r old_backup; do
        log "Deleting old backup: $(basename "$old_backup")"
        rm -f "$old_backup"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "metachat_backup_*.sql.gz" -type f -mtime "+$RETENTION_DAYS")

    if [ $deleted_count -gt 0 ]; then
        log "Deleted $deleted_count old backup(s)"
    else
        log "No old backups to delete"
    fi

    # Also cleanup S3 if enabled
    if [ -n "$S3_ENABLED" ] && command -v aws &> /dev/null; then
        log "Cleaning up S3 backups..."
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)

        aws s3 ls "s3://${DB_BACKUP_S3_BUCKET}/backups/" --region "${DB_BACKUP_S3_REGION:-us-east-1}" | \
        awk '{print $4}' | \
        while read -r s3_file; do
            local file_date=$(echo "$s3_file" | sed -n 's/metachat_backup_\([0-9]\{8\}\)_.*/\1/p')
            if [ -n "$file_date" ]; then
                local formatted_date=$(date -d "${file_date:0:4}-${file_date:4:2}-${file_date:6:2}" +%Y-%m-%d 2>/dev/null || echo "")
                if [ -n "$formatted_date" ] && [ "$formatted_date" \< "$cutoff_date" ]; then
                    log "Deleting old S3 backup: $s3_file"
                    aws s3 rm "s3://${DB_BACKUP_S3_BUCKET}/backups/$s3_file" --region "${DB_BACKUP_S3_REGION:-us-east-1}"
                fi
            fi
        done
    fi
}

# List recent backups
list_backups() {
    log "Recent backups:"
    find "$BACKUP_DIR" -name "metachat_backup_*.sql.gz" -type f -printf "%T@ %Tc %s %p\n" | \
    sort -rn | \
    head -n 10 | \
    awk '{size=$3/1024/1024; printf "  %s %s (%.2f MB)\n", $2" "$3" "$4" "$5" "$6, $NF, size}'
}

# Main execution
main() {
    case "${1:-}" in
        --verify-only)
            setup_backup_dir
            parse_database_url
            LATEST_BACKUP=$(find "$BACKUP_DIR" -name "metachat_backup_*.sql.gz" -type f -printf "%T@ %p\n" | sort -rn | head -n 1 | cut -d' ' -f2)
            if [ -n "$LATEST_BACKUP" ]; then
                verify_backup "$LATEST_BACKUP"
            else
                error "No backups found to verify"
                exit 1
            fi
            ;;
        --cleanup-only)
            setup_backup_dir
            cleanup_old_backups
            ;;
        --list)
            setup_backup_dir
            list_backups
            ;;
        *)
            setup_backup_dir
            parse_database_url

            # Create backup
            backup_database

            # Verify backup
            if verify_backup; then
                # Upload to S3
                upload_to_s3

                # Cleanup old backups
                cleanup_old_backups

                # List recent backups
                list_backups

                log "========================================================================="
                success "Backup completed successfully!"
                log "========================================================================="

                # Optional: Run full restoration test after backup
                if [ "${RUN_FULL_VERIFICATION:-false}" = "true" ]; then
                    log "Running full restoration test..."
                    if [ -x "$SCRIPT_DIR/verify-backup.sh" ]; then
                        "$SCRIPT_DIR/verify-backup.sh" --weekly-full "$BACKUP_FILE"
                    else
                        warning "verify-backup.sh not found or not executable"
                    fi
                fi
            else
                error "Backup verification failed!"
                send_notification "Backup Verification Failed" "Backup was created but failed verification"
                exit 1
            fi
            ;;
        --with-full-test)
            setup_backup_dir
            parse_database_url

            # Create backup
            backup_database

            # Verify backup (quick)
            if verify_backup; then
                # Upload to S3
                upload_to_s3

                # Run full restoration test
                log "Running full restoration test..."
                if [ -x "$SCRIPT_DIR/verify-backup.sh" ]; then
                    "$SCRIPT_DIR/verify-backup.sh" --weekly-full "$BACKUP_FILE"
                else
                    error "verify-backup.sh not found or not executable"
                    exit 1
                fi

                # Cleanup old backups
                cleanup_old_backups

                # List recent backups
                list_backups

                log "========================================================================="
                success "Backup and full verification completed successfully!"
                log "========================================================================="
            else
                error "Backup verification failed!"
                send_notification "Backup Verification Failed" "Backup was created but failed verification"
                exit 1
            fi
            ;;
    esac
}

# Run main function
main "$@"
