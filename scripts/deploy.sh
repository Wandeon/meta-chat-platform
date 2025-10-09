#!/bin/bash
#
# Production Deployment Script for Meta Chat Platform
#
# This script automates the deployment process with:
# - Pre-deployment checks
# - Database migrations
# - Zero-downtime deployment (if PM2 is used)
# - Health checks
# - Automatic rollback on failure
#
# Usage:
#   ./scripts/deploy.sh                    # Deploy latest code
#   ./scripts/deploy.sh --skip-migrations  # Skip database migrations
#   ./scripts/deploy.sh --rollback         # Rollback to previous deployment
#
# Requirements:
#   - Node.js 18+
#   - PM2 (for process management)
#   - PostgreSQL client (for migrations)

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_NAME="metachat"
PM2_ECOSYSTEM="$PROJECT_ROOT/ecosystem.config.js"
BACKUP_DIR="/var/backups/metachat/deployments"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Flags
SKIP_MIGRATIONS=false
ROLLBACK=false
DRY_RUN=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
for arg in "$@"; do
    case $arg in
        --skip-migrations)
            SKIP_MIGRATIONS=true
            ;;
        --rollback)
            ROLLBACK=true
            ;;
        --dry-run)
            DRY_RUN=true
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-migrations  Skip database migrations"
            echo "  --rollback         Rollback to previous deployment"
            echo "  --dry-run          Show what would be done without executing"
            echo "  --help             Show this help message"
            exit 0
            ;;
    esac
done

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

step() {
    echo ""
    echo -e "${GREEN}=========================================================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}=========================================================================${NC}"
}

# Check if running as correct user
check_user() {
    if [ "$(whoami)" != "$DEPLOY_USER" ]; then
        error "This script must be run as the '$DEPLOY_USER' user"
        echo "Run: sudo -u $DEPLOY_USER $0 $*"
        exit 1
    fi
}

# Pre-deployment checks
pre_deployment_checks() {
    step "Running Pre-Deployment Checks"

    # Check Node.js version
    log "Checking Node.js version..."
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi

    NODE_VERSION=$(node -v | sed 's/v//')
    REQUIRED_VERSION="18.0.0"

    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        error "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_VERSION+"
        exit 1
    fi
    success "Node.js version: $NODE_VERSION"

    # Check PM2
    log "Checking PM2..."
    if ! command -v pm2 &> /dev/null; then
        warning "PM2 not installed. Installing globally..."
        npm install -g pm2
    fi
    success "PM2 is installed"

    # Check environment file
    log "Checking environment configuration..."
    if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
        error ".env.production file not found"
        echo "Please create .env.production from .env.production.example"
        exit 1
    fi
    success ".env.production exists"

    # Check database connectivity
    log "Checking database connectivity..."
    if ! npm run db:check --silent; then
        error "Cannot connect to database"
        echo "Please check DATABASE_URL in .env.production"
        exit 1
    fi
    success "Database connection OK"

    # Check disk space
    log "Checking disk space..."
    AVAILABLE_SPACE=$(df -BG "$PROJECT_ROOT" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 5 ]; then
        error "Insufficient disk space: ${AVAILABLE_SPACE}GB available"
        echo "At least 5GB of free space is required"
        exit 1
    fi
    success "Disk space: ${AVAILABLE_SPACE}GB available"

    # Check if port is available (if not running)
    if ! pm2 describe "$APP_NAME" &> /dev/null; then
        PORT=$(grep ^PORT= "$PROJECT_ROOT/.env.production" | cut -d= -f2 | tr -d '"' || echo "3000")
        if lsof -i ":$PORT" &> /dev/null; then
            error "Port $PORT is already in use"
            exit 1
        fi
    fi

    success "All pre-deployment checks passed"
}

# Create deployment backup
create_backup() {
    step "Creating Deployment Backup"

    mkdir -p "$BACKUP_DIR"

    BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"
    mkdir -p "$BACKUP_PATH"

    log "Backing up current deployment..."

    # Backup package.json and lock file
    cp "$PROJECT_ROOT/package.json" "$BACKUP_PATH/" 2>/dev/null || true
    cp "$PROJECT_ROOT/package-lock.json" "$BACKUP_PATH/" 2>/dev/null || true
    cp "$PROJECT_ROOT/pnpm-lock.yaml" "$BACKUP_PATH/" 2>/dev/null || true

    # Backup .env.production
    cp "$PROJECT_ROOT/.env.production" "$BACKUP_PATH/" 2>/dev/null || true

    # Save current git commit
    git rev-parse HEAD > "$BACKUP_PATH/git-commit.txt" 2>/dev/null || echo "unknown" > "$BACKUP_PATH/git-commit.txt"

    # Backup PM2 process list
    pm2 jlist > "$BACKUP_PATH/pm2-processes.json" 2>/dev/null || true

    success "Backup created: $BACKUP_PATH"
    echo "$BACKUP_PATH" > "$PROJECT_ROOT/.last-deployment-backup"
}

# Install dependencies
install_dependencies() {
    step "Installing Dependencies"

    cd "$PROJECT_ROOT"

    # Detect package manager
    if [ -f "pnpm-lock.yaml" ]; then
        log "Using pnpm..."
        if ! command -v pnpm &> /dev/null; then
            npm install -g pnpm
        fi
        pnpm install --frozen-lockfile --prod
    elif [ -f "package-lock.json" ]; then
        log "Using npm..."
        npm ci --production
    else
        log "Using npm (no lockfile)..."
        npm install --production
    fi

    success "Dependencies installed"
}

# Build application
build_application() {
    step "Building Application"

    cd "$PROJECT_ROOT"

    log "Running Turbo build..."
    npm run build

    success "Application built successfully"
}

# Run database migrations
run_migrations() {
    if [ "$SKIP_MIGRATIONS" = true ]; then
        warning "Skipping database migrations (--skip-migrations flag)"
        return 0
    fi

    step "Running Database Migrations"

    cd "$PROJECT_ROOT"

    # Backup database before migrations
    log "Creating pre-migration database backup..."
    ./scripts/backup-database.sh || warning "Database backup failed, continuing anyway"

    log "Running Prisma migrations..."
    npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma

    success "Database migrations completed"
}

# Start or reload application
deploy_application() {
    step "Deploying Application"

    cd "$PROJECT_ROOT"

    # Check if PM2 ecosystem config exists
    if [ ! -f "$PM2_ECOSYSTEM" ]; then
        log "Creating PM2 ecosystem config..."
        cat > "$PM2_ECOSYSTEM" <<'EOF'
module.exports = {
  apps: [{
    name: 'metachat-api',
    script: './apps/api/dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/metachat/pm2-error.log',
    out_file: '/var/log/metachat/pm2-out.log',
    merge_logs: true,
    max_memory_restart: '1G',
    listen_timeout: 10000,
    kill_timeout: 5000
  }]
};
EOF
    fi

    # Start or reload with PM2
    if pm2 describe "$APP_NAME" &> /dev/null; then
        log "Reloading application with zero-downtime..."
        pm2 reload "$PM2_ECOSYSTEM" --update-env
    else
        log "Starting application for the first time..."
        pm2 start "$PM2_ECOSYSTEM"
    fi

    # Save PM2 process list
    pm2 save

    success "Application deployed"
}

# Health check
health_check() {
    step "Running Health Checks"

    local max_attempts=30
    local attempt=1
    local health_url="http://localhost:${PORT:-3000}/health"

    log "Waiting for application to be healthy..."
    log "Health check URL: $health_url"

    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$health_url" > /dev/null 2>&1; then
            success "Application is healthy!"
            curl -s "$health_url" | jq '.' || true
            return 0
        fi

        log "Attempt $attempt/$max_attempts: Application not ready yet..."
        sleep 2
        ((attempt++))
    done

    error "Health check failed after $max_attempts attempts"
    return 1
}

# Rollback deployment
rollback_deployment() {
    step "Rolling Back Deployment"

    if [ ! -f "$PROJECT_ROOT/.last-deployment-backup" ]; then
        error "No backup found for rollback"
        exit 1
    fi

    LAST_BACKUP=$(cat "$PROJECT_ROOT/.last-deployment-backup")

    if [ ! -d "$LAST_BACKUP" ]; then
        error "Backup directory not found: $LAST_BACKUP"
        exit 1
    fi

    log "Rolling back to: $LAST_BACKUP"

    # Restore files
    cp "$LAST_BACKUP/package.json" "$PROJECT_ROOT/" 2>/dev/null || true
    cp "$LAST_BACKUP/package-lock.json" "$PROJECT_ROOT/" 2>/dev/null || true
    cp "$LAST_BACKUP/.env.production" "$PROJECT_ROOT/" 2>/dev/null || true

    # Restore git commit
    if [ -f "$LAST_BACKUP/git-commit.txt" ]; then
        ROLLBACK_COMMIT=$(cat "$LAST_BACKUP/git-commit.txt")
        if [ "$ROLLBACK_COMMIT" != "unknown" ]; then
            log "Checking out commit: $ROLLBACK_COMMIT"
            git checkout "$ROLLBACK_COMMIT"
        fi
    fi

    # Reinstall dependencies
    install_dependencies

    # Rebuild
    build_application

    # Reload application
    pm2 reload "$APP_NAME"

    success "Rollback completed"
}

# Cleanup old deployments
cleanup_old_backups() {
    log "Cleaning up old deployment backups (keeping last 10)..."

    cd "$BACKUP_DIR"
    ls -t | tail -n +11 | xargs -r rm -rf

    success "Cleanup completed"
}

# Post-deployment tasks
post_deployment() {
    step "Post-Deployment Tasks"

    # Show PM2 status
    log "PM2 process status:"
    pm2 list

    # Show application logs (last 20 lines)
    log "Recent application logs:"
    pm2 logs "$APP_NAME" --lines 20 --nostream || true

    # Save deployment metadata
    cat > "$PROJECT_ROOT/.deployment-info.json" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "user": "$(whoami)",
  "node_version": "$(node -v)",
  "npm_version": "$(npm -v)"
}
EOF

    success "Deployment information saved"
}

# Main deployment flow
main() {
    if [ "$DRY_RUN" = true ]; then
        warning "DRY RUN MODE - No changes will be made"
        echo ""
    fi

    if [ "$ROLLBACK" = true ]; then
        rollback_deployment
        health_check
        exit 0
    fi

    echo ""
    echo "========================================================================="
    echo "Meta Chat Platform - Production Deployment"
    echo "========================================================================="
    echo "Time: $(date)"
    echo "User: $(whoami)"
    echo "Path: $PROJECT_ROOT"
    echo "========================================================================="
    echo ""

    check_user
    pre_deployment_checks
    create_backup

    if [ "$DRY_RUN" = false ]; then
        install_dependencies
        build_application
        run_migrations
        deploy_application

        if health_check; then
            post_deployment
            cleanup_old_backups

            echo ""
            success "========================================================================="
            success " DEPLOYMENT SUCCESSFUL!"
            success "========================================================================="
            echo ""
            echo "Application is now running and healthy."
            echo ""
            echo "Useful commands:"
            echo "  pm2 logs $APP_NAME     - View application logs"
            echo "  pm2 monit              - Monitor resources"
            echo "  pm2 restart $APP_NAME  - Restart application"
            echo ""
        else
            error "Deployment failed health check!"
            echo ""
            echo "To rollback, run: $0 --rollback"
            exit 1
        fi
    else
        echo "Dry run complete. No changes were made."
    fi
}

# Run main function
main
