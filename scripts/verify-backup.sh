#!/bin/bash
#
# Database Backup Verification Script for Meta Chat Platform
#
# This script verifies SQL dump backups created by backup-database.sh by:
# - Finding the latest backup file
# - Verifying file integrity with gunzip -t
# - Creating a temporary test database
# - Restoring the backup to the test database
# - Verifying data integrity by checking table counts
# - Cleaning up the test database
# - Logging all results for monitoring
#
# Usage:
#   ./scripts/verify-backup.sh                     # Verify latest backup
#   ./scripts/verify-backup.sh /path/to/backup.gz  # Verify specific backup
#   ./scripts/verify-backup.sh --weekly-full       # Full restoration test
#
# Cron setup (weekly verification on Sunday at 3 AM):
#   0 3 * * 0 /home/deploy/meta-chat-platform/scripts/verify-backup.sh >> /home/deploy/backups/verification.log 2>&1

set -euo pipefail

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_ROOT/.env.production" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env.production" | xargs)
fi

# Configuration
BACKUP_DIR="${DB_BACKUP_PATH:-/var/backups/metachat}"
LOG_FILE="${BACKUP_VERIFICATION_LOG:-/var/log/metachat/verification.log}"
TEST_DB_NAME="metachat_backup_test_$(date +%s)"
WEEKLY_FULL_TEST="${1:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters for summary
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Logging functions
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    ((FAILED_CHECKS++))
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
    ((PASSED_CHECKS++))
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Send notification (optional)
send_notification() {
    local subject="$1"
    local message="$2"

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

# Find latest backup
find_latest_backup() {
    if [ -n "${1:-}" ] && [ -f "$1" ]; then
        echo "$1"
        return 0
    fi

    local latest_backup
    latest_backup=$(find "$BACKUP_DIR" -name "metachat_backup_*.sql.gz" -type f -printf "%T@ %p\n" 2>/dev/null | sort -rn | head -n 1 | cut -d' ' -f2)

    if [ -z "$latest_backup" ]; then
        # Try alternative naming pattern
        latest_backup=$(find "$BACKUP_DIR" -name "metachat_*.sql.gz" -type f -printf "%T@ %p\n" 2>/dev/null | sort -rn | head -n 1 | cut -d' ' -f2)
    fi

    if [ -z "$latest_backup" ]; then
        error "No backup files found in $BACKUP_DIR"
        exit 1
    fi

    echo "$latest_backup"
}

# Check if backup file exists and is readable
check_backup_exists() {
    local backup_file="$1"

    ((TOTAL_CHECKS++))
    info "Checking if backup file exists: $(basename "$backup_file")"

    if [ ! -f "$backup_file" ]; then
        error "Backup file does not exist: $backup_file"
        return 1
    fi

    if [ ! -r "$backup_file" ]; then
        error "Backup file is not readable: $backup_file"
        return 1
    fi

    success "Backup file exists and is readable"
    return 0
}

# Check if backup file is not empty
check_backup_not_empty() {
    local backup_file="$1"

    ((TOTAL_CHECKS++))
    info "Checking if backup file is not empty"

    if [ ! -s "$backup_file" ]; then
        error "Backup file is empty (0 bytes)"
        return 1
    fi

    local size_bytes=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
    local size_mb=$((size_bytes / 1024 / 1024))

    success "Backup file size: ${size_mb}MB (${size_bytes} bytes)"
    return 0
}

# Verify gzip integrity
verify_gzip_integrity() {
    local backup_file="$1"

    ((TOTAL_CHECKS++))
    info "Verifying gzip integrity"

    if ! gzip -t "$backup_file" 2>/dev/null; then
        error "Backup file is corrupted (gzip test failed)"
        return 1
    fi

    success "Gzip integrity check passed"
    return 0
}

# Verify SQL structure
verify_sql_structure() {
    local backup_file="$1"

    ((TOTAL_CHECKS++))
    info "Verifying SQL structure"

    # Check for PostgreSQL dump header
    if ! zcat "$backup_file" | head -n 50 | grep -q "PostgreSQL database dump"; then
        error "Backup file does not appear to be a valid PostgreSQL dump"
        return 1
    fi

    # Check for expected table definitions
    local has_tables=false
    if zcat "$backup_file" | grep -q "CREATE TABLE"; then
        has_tables=true
    fi

    if [ "$has_tables" = false ]; then
        warning "No CREATE TABLE statements found in backup (might be an empty database)"
    else
        success "SQL structure appears valid (contains CREATE TABLE statements)"
    fi

    return 0
}

# Check prerequisites for restoration
check_restoration_prerequisites() {
    ((TOTAL_CHECKS++))
    info "Checking restoration prerequisites"

    # Check if psql is installed
    if ! command -v psql &> /dev/null; then
        error "psql not found. Please install postgresql-client."
        return 1
    fi

    # Check if createdb is installed
    if ! command -v createdb &> /dev/null; then
        error "createdb not found. Please install postgresql-client."
        return 1
    fi

    # Test database connection
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1" >/dev/null 2>&1; then
        error "Cannot connect to database server"
        return 1
    fi

    success "All restoration prerequisites met"
    return 0
}

# Create test database
create_test_database() {
    ((TOTAL_CHECKS++))
    info "Creating test database: $TEST_DB_NAME"

    if createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$TEST_DB_NAME" 2>/dev/null; then
        success "Test database created successfully"
        return 0
    else
        error "Failed to create test database"
        return 1
    fi
}

# Restore backup to test database
restore_backup() {
    local backup_file="$1"

    ((TOTAL_CHECKS++))
    info "Restoring backup to test database (this may take a few minutes)..."

    if zcat "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB_NAME" >/dev/null 2>&1; then
        success "Backup restored successfully"
        return 0
    else
        error "Failed to restore backup"
        return 1
    fi
}

# Verify data integrity
verify_data_integrity() {
    ((TOTAL_CHECKS++))
    info "Verifying data integrity in restored database"

    local tables_output
    tables_output=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB_NAME" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null)

    if [ -z "$tables_output" ]; then
        warning "No tables found in restored database (might be a fresh database)"
        return 0
    fi

    local table_count=$(echo "$tables_output" | grep -v '^$' | wc -l)
    info "Found $table_count tables in restored database"

    # Check row counts for critical tables
    local critical_tables=("tenants" "channels" "conversations" "messages" "documents" "chunks")
    local verified_tables=0

    for table in "${critical_tables[@]}"; do
        if echo "$tables_output" | grep -q "^[[:space:]]*$table[[:space:]]*$"; then
            local count
            count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB_NAME" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')

            if [ -n "$count" ] && [ "$count" -ge 0 ]; then
                info "  ✓ Table '$table': $count rows"
                ((verified_tables++))
            else
                warning "  ✗ Table '$table': Could not count rows"
            fi
        fi
    done

    if [ $verified_tables -gt 0 ]; then
        success "Data integrity verification passed ($verified_tables critical tables verified)"
        return 0
    else
        warning "No critical tables found to verify (database might be empty)"
        return 0
    fi
}

# Clean up test database
cleanup_test_database() {
    info "Cleaning up test database: $TEST_DB_NAME"

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB_NAME;" >/dev/null 2>&1; then
        success "Test database cleaned up"
    else
        warning "Failed to clean up test database (manual cleanup may be required)"
    fi
}

# Print summary
print_summary() {
    log "========================================================================="
    log "VERIFICATION SUMMARY"
    log "========================================================================="
    log "Total checks: $TOTAL_CHECKS"
    log "Passed: $PASSED_CHECKS"
    log "Failed: $FAILED_CHECKS"
    log "Success rate: $(awk "BEGIN {printf \"%.1f\", ($PASSED_CHECKS/$TOTAL_CHECKS)*100}")%"
    log "========================================================================="
}

# Weekly full restoration test
weekly_full_test() {
    local backup_file="$1"

    log "========================================================================="
    log "WEEKLY FULL RESTORATION TEST"
    log "========================================================================="

    # All verification steps
    if check_backup_exists "$backup_file" && \
       check_backup_not_empty "$backup_file" && \
       verify_gzip_integrity "$backup_file" && \
       verify_sql_structure "$backup_file" && \
       check_restoration_prerequisites && \
       create_test_database && \
       restore_backup "$backup_file" && \
       verify_data_integrity; then

        cleanup_test_database
        print_summary

        if [ $FAILED_CHECKS -eq 0 ]; then
            log "========================================================================="
            success "WEEKLY FULL TEST COMPLETED SUCCESSFULLY!"
            log "========================================================================="
            send_notification "Weekly Backup Test: SUCCESS" "All backup verification checks passed"
            return 0
        else
            log "========================================================================="
            error "WEEKLY FULL TEST COMPLETED WITH FAILURES"
            log "========================================================================="
            send_notification "Weekly Backup Test: FAILED" "Some verification checks failed"
            return 1
        fi
    else
        cleanup_test_database
        print_summary
        log "========================================================================="
        error "WEEKLY FULL TEST FAILED"
        log "========================================================================="
        send_notification "Weekly Backup Test: FAILED" "Verification or restoration failed"
        return 1
    fi
}

# Quick verification (no restoration)
quick_verification() {
    local backup_file="$1"

    log "========================================================================="
    log "QUICK BACKUP VERIFICATION"
    log "========================================================================="

    if check_backup_exists "$backup_file" && \
       check_backup_not_empty "$backup_file" && \
       verify_gzip_integrity "$backup_file" && \
       verify_sql_structure "$backup_file"; then

        print_summary

        if [ $FAILED_CHECKS -eq 0 ]; then
            log "========================================================================="
            success "QUICK VERIFICATION COMPLETED SUCCESSFULLY!"
            log "========================================================================="
            return 0
        else
            log "========================================================================="
            error "QUICK VERIFICATION COMPLETED WITH FAILURES"
            log "========================================================================="
            send_notification "Backup Verification: FAILED" "Quick verification checks failed"
            return 1
        fi
    else
        print_summary
        log "========================================================================="
        error "QUICK VERIFICATION FAILED"
        log "========================================================================="
        send_notification "Backup Verification: FAILED" "Quick verification failed"
        return 1
    fi
}

# Main execution
main() {
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"

    # Parse database connection
    parse_database_url

    # Find backup file
    local backup_file
    backup_file=$(find_latest_backup "${1:-}")

    log "========================================================================="
    log "BACKUP VERIFICATION SCRIPT"
    log "========================================================================="
    log "Timestamp: $(date +'%Y-%m-%d %H:%M:%S %Z')"
    log "Backup file: $backup_file"
    log "Backup directory: $BACKUP_DIR"
    log "Database: $DB_NAME"
    log "Host: $DB_HOST"
    log "========================================================================="

    # Run appropriate test
    if [ "$WEEKLY_FULL_TEST" = "--weekly-full" ]; then
        weekly_full_test "$backup_file"
    else
        quick_verification "$backup_file"
    fi

    local exit_code=$?

    # Clean up
    unset PGPASSWORD

    exit $exit_code
}

# Run main function
main "$@"
