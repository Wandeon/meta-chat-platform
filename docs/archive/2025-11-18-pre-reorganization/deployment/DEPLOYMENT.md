# Meta Chat Platform - Deployment Guide

**Target System:** genai.hr VPS
**Date:** 2025-10-08
**Status:** Pre-deployment Planning

---

## 🖥️ System Overview

### Current Infrastructure

**Hardware Resources:**
- **CPU:** 4 cores (AMD EPYC-Rome)
- **RAM:** 7.8GB total (5.4GB available)
- **Disk:** 503GB total, 370GB available
- **OS:** Debian Linux (kernel 6.1.0)

**Software Stack:**
- **Docker:** ✅ Installed
- **Docker Compose:** ✅ Installed
- **Node.js:** ✅ v20.19.5 (matches requirement)
- **npm:** ✅ v11.6.0
- **Nginx:** ✅ Installed (reverse proxy)
- **Let's Encrypt:** ✅ Configured
- **GitHub CLI:** ✅ Installed
- **Tailscale VPN:** ✅ Connected

### Existing Services

**Running Containers:**
| Service | Port | Domain | Memory |
|---------|------|--------|--------|
| N8N | 127.0.0.1:5678 | app.genai.hr | 608MB |
| Nextcloud | 0.0.0.0:8080 | files.genai.hr | 2GB |
| MariaDB | 3306 (internal) | - | 191MB |
| Netdata | 127.0.0.1:19999 | monitor.genai.hr | 323MB |
| Portainer | 127.0.0.1:9000 | docker.genai.hr | 25MB |

**Reserved Ports:**
- 22 (SSH)
- 80, 443 (Nginx)
- 5678 (N8N)
- 8080 (Nextcloud)
- 9000, 9443 (Portainer)
- 19999 (Netdata)

---

## ✅ Compatibility Assessment

### Resource Requirements vs. Availability

| Component | Required | Available | Status |
|-----------|----------|-----------|--------|
| **CPU** | 2+ cores | 4 cores | ✅ 2x headroom |
| **RAM** | 2-3GB | 5.4GB | ✅ Sufficient |
| **Disk** | 10GB | 370GB | ✅ Plenty |
| **Node.js** | 20+ | 20.19.5 | ✅ Match |
| **PostgreSQL** | 15+ | Not installed | ⚠️ Need to install |
| **Redis** | 7+ | Not installed | ⚠️ Need to install |
| **RabbitMQ** | 3+ | Not installed | 🔵 Optional |

**Verdict:** ✅ **System is fully capable of running this platform**

### Port Allocation Plan

**New Services:**
| Service | Port | Public Access | Notes |
|---------|------|---------------|-------|
| API Server | 127.0.0.1:3000 | Via Nginx | Main application |
| PostgreSQL | 127.0.0.1:5432 | No | Database |
| Redis | 127.0.0.1:6379 | No | Cache |
| RabbitMQ | 127.0.0.1:5672 | No | Message queue (optional) |
| Dashboard | 127.0.0.1:3001 | Via Nginx | Management UI |

**Domain Mapping:**
- `chat.genai.hr` → API Server (127.0.0.1:3000)
- `chat-admin.genai.hr` → Dashboard (127.0.0.1:3001)

---

## 🏗️ Deployment Architecture

### Docker Compose Strategy

```
/home/deploy/meta-chat-platform/
├── docker/
│   ├── docker-compose.yml      # Core services + ops helpers
│   ├── api.Dockerfile          # Production API image
│   └── dashboard.Dockerfile    # Dashboard/placeholder image
├── .env                        # Environment overrides (optional)
├── storage/                    # Uploaded documents
├── postgres-data/              # PostgreSQL volume
├── redis-data/                 # Redis volume
└── apps/
    ├── api/                    # Built & running
    └── dashboard/              # Built & running
```

### Network Isolation

```
Docker Network: meta-chat-network (bridge)
├── postgres (internal only)
├── redis (internal only)
├── rabbitmq (internal only)
├── api (exposed to 127.0.0.1:3000)
└── dashboard (exposed to 127.0.0.1:3001)
```

### Secrets Management

- **Environment templates**: Production defaults live in `apps/api/.env.production` and `apps/dashboard/.env.production`. Copy these to `/home/deploy/meta-chat-platform/secrets/` (or your password manager vault), set ownership to the deploy user, and restrict permissions (`chmod 600`).
- **Runtime overrides**: Place non-secret overrides in `.env` beside `docker/docker-compose.yml`. Sensitive values (API keys, JWT secrets) must never be committed—inject them at deploy time via `docker compose --env-file` or environment-specific secret stores (1Password Connect, Doppler, AWS Secrets Manager, etc.).
- **Rotation**: Store the generated admin API keys from `ops/seed-admin.cjs` in an encrypted vault. The script can be re-run with the same `--label` to rotate credentials without creating duplicates.
- **Audit**: Track who loads the `.env.production` files and ensure secrets changes are reflected in your change-management tool (e.g., create a ticket whenever JWT secrets rotate).

### Network Bindings

- `postgres`: bound to `127.0.0.1:5432` for local access only. Use SSH tunnels or Tailscale for remote administration.
- `redis`: bound to `127.0.0.1:6379` with append-only persistence enabled. Protect with host-level firewall rules.
- `rabbitmq`: AMQP on `127.0.0.1:5672`, management UI on `127.0.0.1:15672`. Restrict inbound firewall access and change the default credentials in your `.env.production` file.
- `api`: exported on `127.0.0.1:3000`; Nginx terminates TLS and proxies public requests to this port.
- `dashboard`: exported on `127.0.0.1:3001`; behind Nginx basic auth until SSO is implemented.

### Startup Order & Automation

1. `ops/bootstrap-stack.sh` orchestrates the full bring-up: builds images, starts data services, runs migrations, and launches API/dashboard containers. Pass `--seed-admin-email` to automate admin provisioning.
2. `ops/run-migrations.sh` can be invoked after schema changes or during CI/CD to ensure the database schema matches the Prisma migrations (`docker compose --profile ops run --rm migrator`).
3. Admin seeding runs through `ops/seed-admin.cjs` (also exposed via the `seed-admin` compose service). Re-running with the same label rotates the API key without leaving stale credentials.

**Manual fallback:** If the bootstrap script fails, start the services incrementally using `docker compose -f docker/docker-compose.yml up -d postgres redis rabbitmq`, run migrations, then `up -d api dashboard`.

### High-Availability Topology

**Data Layer:**
- **PostgreSQL:** Two-node cluster managed by `bitnami/postgresql-repmgr` images with automatic failover via PgPool. Primary and hot-standby share WAL archiving to object storage. PgPool presents a single connection endpoint (`pgpool:5432`) and performs connection load balancing/health checks.
- **Redis:** Managed Redis (e.g., AWS ElastiCache, Upstash, or Azure Cache) with Multi-AZ replication. All application services consume a single `REDIS_URL` stored in the environment.

**Application Layer:**
- API and Dashboard services run in Docker with health-check-driven `restart: always` policies. Each service publishes Prometheus `/metrics` for observability.
- Optional workers (ingest, queue) should join the `core` network and reuse the same health-check configuration.

**Monitoring & Alerting:**
- Prometheus scrapes service metrics and exporters (PostgreSQL, Redis, synthetic probes).
- Alertmanager fan-outs notifications to Slack, PagerDuty, and email using templates.
- Grafana consumes Prometheus and Loki for dashboards and unified alerting.

**Resilience Highlights:**
- Health checks gate container restarts, preventing cascading failures from flapping services.
- Replicated PostgreSQL provides RPO ≈ 0 via synchronous streaming; backups validate with `scripts/backup/verify_backups.sh`.
- Managed Redis absorbs failover, while Redis exporter/Alertmanager ensure cache health is visible.

### SSL/TLS Setup

- **Certbot:** Use existing Let's Encrypt setup
- **Domains:** Register `chat.genai.hr` and `chat-admin.genai.hr`
- **Nginx:** Reverse proxy with WebSocket support

---

## 📋 Deployment Checklist

### Phase 1: Infrastructure Setup

- [ ] **1.1** Create Docker Compose file with all services
- [ ] **1.2** Create `.env` file from `.env.example`
- [ ] **1.3** Configure PostgreSQL with pgvector extension
- [ ] **1.4** Configure Redis persistence
- [ ] **1.5** Set up storage directory with proper permissions

### Phase 2: Application Build

- [ ] **2.1** Install dependencies (`npm install`)
- [ ] **2.2** Build all packages (`npm run build`)
- [ ] **2.3** Generate Prisma client (`npm run db:generate`)
- [ ] **2.4** Run database migrations (`npm run db:push`)
- [ ] **2.5** Verify build artifacts

### Phase 3: Service Deployment

- [ ] **3.1** Start PostgreSQL and verify connection
- [ ] **3.2** Enable pgvector extension on primary and confirm replication to standby
- [ ] **3.3** Point services at managed Redis endpoint and verify TLS/auth
- [ ] **3.4** Start API server and confirm `/api/health` returns 200
- [ ] **3.5** Start Dashboard and verify access
- [ ] **3.6** Confirm Prometheus, Alertmanager, and Grafana are scraping/alerting

### Phase 4: Reverse Proxy Configuration

- [ ] **4.1** Create nginx config for `chat.genai.hr`
- [ ] **4.2** Create nginx config for `chat-admin.genai.hr`
- [ ] **4.3** Test nginx configuration
- [ ] **4.4** Obtain SSL certificates with certbot
- [ ] **4.5** Enable nginx sites and reload

### Phase 5: Verification & Testing

- [ ] **5.1** Test API health endpoint (`/api/health`)
- [ ] **5.2** Test Dashboard access
- [ ] **5.3** Create test tenant via API
- [ ] **5.4** Verify database connectivity
- [ ] **5.5** Verify Redis connectivity
- [ ] **5.6** Test OpenAI API integration
- [ ] **5.7** Verify webhook endpoints are accessible
- [ ] **5.8** Run `scripts/backup/verify_backups.sh` and archive the log
- [ ] **5.9** Execute `scripts/backup/rollback.sh --dry-run` to rehearse restoration

### Local Validation & Troubleshooting

1. **Validate Compose syntax**: `python -c "import yaml, pathlib; yaml.safe_load(pathlib.Path('docker/docker-compose.yml').read_text())"` (runs without needing a Docker daemon).
2. **Dry-run build**: `docker compose -f docker/docker-compose.yml build --no-cache --pull` to surface missing dependencies before the maintenance window.
3. **Health checks**: Use `docker inspect --format '{{json .State.Health}}' meta-chat-api | jq` to confirm readiness gates before promoting traffic.
4. **Common issues**:
   - *`database is locked` errors*: ensure Prisma migrations finish before API boot (`ops/run-migrations.sh`).
   - *Permission denied on storage path*: fix host permissions with `sudo chown -R deploy:deploy storage && chmod 750 storage`.
   - *RabbitMQ refusing connections*: verify credentials match the overridden `.env.production` values and reset using `docker compose restart rabbitmq`.
5. **Rollback plan**: stop services via `docker compose down` and follow `scripts/backup/rollback.sh --dry-run` to rehearse restoration before the go-live milestone.

### Phase 6: Migration Path to High Availability

1. **Preparation**
   - Provision managed Redis with Multi-AZ replication and TLS enforced.
   - Allocate two new VMs (or containers) for PostgreSQL primary/standby with shared storage (e.g., NFS or block volumes).
   - Populate `.env.ha` with credentials for PgPool, replication, and Redis.
2. **Seed Replicated PostgreSQL**
   - Deploy the HA stack via `docker compose -f ops/docker-compose.ha.yml up -d pg-primary pg-standby pgpool`.
   - Run migrations against PgPool (`DATABASE_URL=postgres://...@localhost:5432`).
   - Validate replication lag via Prometheus (`pg_replication_lag` metric < 1s).
3. **Cut Redis Over**
   - Flush existing Redis data to ensure compatibility.
   - Update application secrets to point to managed `REDIS_URL`; restart API/Dashboard containers.
   - Monitor Redis exporter metrics and Alertmanager notifications.
4. **Application Cutover**
   - Update Nginx upstreams to target PgPool and the HA API container addresses.
   - Drain legacy single-node PostgreSQL, take final backup, and keep as read-only fallback for 24 hours.
   - Execute synthetic probes via Prometheus Blackbox to confirm end-to-end availability.
5. **Post-Migration Hardening**
   - Schedule `scripts/backup/verify_backups.sh` in cron (e.g., hourly) and ship logs to centralized storage.
   - Enable automated rollback drill in CI using `scripts/backup/rollback.sh --dry-run`.
   - Review Grafana dashboards and adjust Alertmanager receivers before declaring GA.

### Automated Backups & Rollback

- **Backup Verification:** `scripts/backup/verify_backups.sh` validates the most recent PostgreSQL `pg_basebackup` artifact and Redis snapshots (`redis-check-{rdb,aof}`), rotating logs after 30 days.
- **Rollback Automation:** `scripts/backup/rollback.sh` orchestrates a controlled restore by stopping dependent services, reseeding primary/standby volumes, flushing managed Redis, and rerunning health checks with optional `--dry-run` support.
- **Scheduling:** Add cron entries (example below) to automate verification and produce actionable logs:

  ```cron
  15 * * * * BACKUP_ROOT=/mnt/backups/meta-chat /home/deploy/meta-chat-platform/scripts/backup/verify_backups.sh
  0 3 * * 0 BACKUP_ROOT=/mnt/backups/meta-chat /home/deploy/meta-chat-platform/scripts/backup/rollback.sh --dry-run
  ```

### Monitoring & Alerting Enhancements

- **Prometheus:** Configured via `ops/monitoring/prometheus.yml` to scrape services, exporters, and synthetic HTTP probes.
- **Alertmanager:** Routes alerts to Slack (`SLACK_WEBHOOK_URL`), PagerDuty (`PAGERDUTY_ROUTING_KEY`), and email. Templates live in `ops/monitoring/templates/`.
- **Grafana/Loki:** Bundled dashboards and logs accessible on port `3002` with unified alerting toggled on by default.
- **Health-Check Driven Restarts:** All critical containers rely on explicit health probes. Docker Compose restarts them only when checks fail, avoiding infinite crash loops on transient startup errors.

---

## 🔐 Operational API Key Rotation Procedures

### Admin API Key Rotation

1. **Identify key** — List admin keys from the database (`admin_api_keys`) filtered by `admin_id` and `active = true` to confirm the key that needs rotation (use Prisma Studio or `psql`).
2. **Request rotation token** — From a trusted workstation run:
   ```bash
   curl -X POST \
     -H "x-admin-key: <SUPER_ADMIN_KEY>" \
     -H "Content-Type: application/json" \
     https://chat.genai.hr/api/security/admin/users/<ADMIN_ID>/api-keys/<KEY_ID>/rotation
   ```
   The response includes `rotationToken` and `expiresAt` (defaults to 15 minutes).
3. **Confirm rotation** — Within the validity window execute:
   ```bash
   curl -X POST \
     -H "x-admin-key: <SUPER_ADMIN_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"token":"<ROTATION_TOKEN_FROM_STEP_2>"}' \
     https://chat.genai.hr/api/security/admin/users/<ADMIN_ID>/api-keys/<KEY_ID>/rotation/confirm
   ```
   The API returns the new plaintext key once. Store it in the password manager immediately.
4. **Distribute update** — Update any automation, CLI configs, or secrets managers with the new key and revoke old credentials from dependent services.
5. **Audit** — Verify the row in `admin_api_keys` now shows updated `prefix`, `lastFour`, and `rotatedAt`. Clear any cached copies of the previous key.

### Tenant API Key Rotation

1. **Request token** — Super admins initiate rotation for a tenant key:
   ```bash
   curl -X POST \
     -H "x-admin-key: <SUPER_ADMIN_KEY>" \
     -H "Content-Type: application/json" \
     https://chat.genai.hr/api/security/tenants/<TENANT_ID>/api-keys/<KEY_ID>/rotation
   ```
   Share the resulting `rotationToken` (over a secure channel) with the tenant operator who will confirm the change.
2. **Confirm rotation** — The operator sends the token back using:
   ```bash
   curl -X POST \
     -H "x-admin-key: <SUPER_ADMIN_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"token":"<ROTATION_TOKEN_FROM_STEP_1>"}' \
     https://chat.genai.hr/api/security/tenants/<TENANT_ID>/api-keys/<KEY_ID>/rotation/confirm
   ```
   The API responds with the newly generated tenant key. Communicate it securely and prompt the tenant to update their integrations.
3. **Validation** — Confirm successful authentication by calling a tenant-protected endpoint with the new key. Remove the old key from the tenant's systems immediately.
4. **Incident fallback** — If the token expires before confirmation, repeat the process starting from step 1 to issue a fresh token.

### Phase 6: Monitoring & Backup

- [ ] **6.1** Configure container restart policies
- [ ] **6.2** Set up PostgreSQL backup script
- [ ] **6.3** Add to Netdata monitoring
- [ ] **6.4** Configure log rotation
- [ ] **6.5** Test disaster recovery

---

## 🚀 Deployment Commands

### Initial Setup

```bash
# Navigate to project
cd /home/deploy/meta-chat-platform

# Install dependencies
npm install

# Build all packages
npm run build

# Generate Prisma client
npm run db:generate
```

### Docker Compose Deployment

```bash
# Start all services
docker-compose up -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f api

# Run database migrations
docker-compose exec api npm run db:push

# Enable pgvector extension
docker-compose exec postgres psql -U postgres -d metachat -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Nginx Configuration

```bash
# Create nginx config
sudo nano /etc/nginx/sites-available/chat.genai.hr

# Enable site
sudo ln -s /etc/nginx/sites-available/chat.genai.hr /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Obtain SSL certificate
sudo certbot --nginx -d chat.genai.hr -d chat-admin.genai.hr
```

---

## 🔧 Configuration Files

### Docker Compose (docker-compose.yml)

```yaml
version: '3.8'

services:
  postgres:
    image: ankane/pgvector:pg15
    container_name: meta-chat-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: metachat
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - ./postgres-data:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    networks:
      - meta-chat-network

  redis:
    image: redis:7-alpine
    container_name: meta-chat-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - ./redis-data:/data
    ports:
      - "127.0.0.1:6379:6379"
    networks:
      - meta-chat-network

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: meta-chat-rabbitmq
    restart: unless-stopped
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER:-admin}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASS}
    volumes:
      - ./rabbitmq-data:/var/lib/rabbitmq
    ports:
      - "127.0.0.1:5672:5672"
      - "127.0.0.1:15672:15672"
    networks:
      - meta-chat-network

  api:
    build:
      context: .
      dockerfile: docker/api.Dockerfile
      target: runtime
    container_name: meta-chat-api
    restart: unless-stopped
    env_file:
      - apps/api/.env.production
    environment:
      DATABASE_URL: ${DATABASE_URL:-postgresql://metachat:metachat@postgres:5432/metachat?schema=public}
      REDIS_URL: ${REDIS_URL:-redis://redis:6379/0}
      RABBITMQ_URL: ${RABBITMQ_URL:-amqp://rabbitmq:5672}
      STORAGE_PATH: ${STORAGE_PATH:-/app/storage}
    volumes:
      - storage:/app/storage
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    networks:
      - meta-chat-network

  dashboard:
    build:
      context: .
      dockerfile: docker/dashboard.Dockerfile
      target: runtime
    container_name: meta-chat-dashboard
    restart: unless-stopped
    env_file:
      - apps/dashboard/.env.production
    ports:
      - "127.0.0.1:3001:4173"
    depends_on:
      api:
        condition: service_started
    networks:
      - meta-chat-network

networks:
  meta-chat-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  rabbitmq-data:
  storage:
```

> **Note:** `docker/dashboard-entrypoint.cjs` serves a lightweight placeholder response (including `/health`) until the real dashboard workspace ships its own `start` script. Replace this fallback when the UI is production-ready.

### Nginx Config (chat.genai.hr)

```nginx
# WebSocket upgrade support
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

# API Server
server {
    listen 443 ssl http2;
    server_name chat.genai.hr;

    ssl_certificate     /etc/letsencrypt/live/chat.genai.hr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.genai.hr/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 900s;
    }
}

# Dashboard
server {
    listen 443 ssl http2;
    server_name chat-admin.genai.hr;

    ssl_certificate     /etc/letsencrypt/live/chat.genai.hr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.genai.hr/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Basic Auth (Optional)
    # auth_basic           "Restricted";
    # auth_basic_user_file /etc/nginx/.htpasswd-meta-chat;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP redirect
server {
    listen 80;
    server_name chat.genai.hr chat-admin.genai.hr;
    return 301 https://$host$request_uri;
}
```

### Environment Variables (.env)

```bash
# Database
DATABASE_URL="postgresql://postgres:YOUR_DB_PASSWORD@localhost:5432/metachat?schema=public"
DB_PASSWORD="YOUR_DB_PASSWORD"

# Redis
REDIS_URL="redis://localhost:6379"

# RabbitMQ
RABBITMQ_URL="amqp://admin:YOUR_RABBITMQ_PASSWORD@localhost:5672"
RABBITMQ_USER="admin"
RABBITMQ_PASS="YOUR_RABBITMQ_PASSWORD"

# OpenAI (GET FROM N8N OR USER)
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"

# Server
NODE_ENV="production"
PORT="3000"
API_URL="https://chat.genai.hr"

# Global API Key
GLOBAL_API_KEY="GENERATE_SECURE_RANDOM_KEY"

# File Storage
STORAGE_PATH="./storage"

# Webhooks
WEBHOOK_RETRY_MAX_ATTEMPTS="5"
WEBHOOK_RETRY_INITIAL_DELAY_MS="1000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="60000"
RATE_LIMIT_MAX_REQUESTS="100"

# Logging
LOG_LEVEL="info"
```

---

## 🔐 Security Considerations

### Credentials Management

- [ ] Generate strong random passwords for PostgreSQL, Redis, RabbitMQ
- [ ] Generate secure GLOBAL_API_KEY (use `openssl rand -hex 32`)
- [ ] Store `.env` securely (not in git)
- [ ] Obtain OpenAI API key from existing N8N setup or user

### Network Security

- [x] All services bound to localhost (127.0.0.1)
- [x] Public access only via Nginx reverse proxy
- [x] SSL/TLS encryption for all external traffic
- [ ] Consider basic auth for dashboard
- [x] Fail2ban already protecting SSH and HTTP

### Backup Strategy

- [ ] **Daily PostgreSQL dumps** → `/home/deploy/backups/meta-chat/`
- [ ] **7-day retention** (similar to N8N backup)
- [ ] **Include storage directory** in backups
- [ ] **Test restore procedure**

#### PostgreSQL Backup Commands

**Create Backup:**
```bash
# Create backup directory if it doesn't exist
mkdir -p /home/deploy/backups/meta-chat

# Create compressed backup with custom format (recommended)
pg_dump -Fc -h localhost -U metachat -d metachat > /home/deploy/backups/meta-chat/backup-$(date +%Y%m%d-%H%M%S).dump

# Or create plain SQL backup
pg_dump -h localhost -U metachat -d metachat > /home/deploy/backups/meta-chat/backup-$(date +%Y%m%d-%H%M%S).sql

# Backup with Docker
docker exec meta-chat-postgres pg_dump -U metachat -d metachat -Fc > /home/deploy/backups/meta-chat/backup-$(date +%Y%m%d-%H%M%S).dump
```

**Restore Backup:**
```bash
# Restore from custom format backup
pg_restore -h localhost -U metachat -d metachat -c /home/deploy/backups/meta-chat/backup-20250109-120000.dump

# Restore from SQL backup
psql -h localhost -U metachat -d metachat < /home/deploy/backups/meta-chat/backup-20250109-120000.sql

# Restore with Docker
docker exec -i meta-chat-postgres pg_restore -U metachat -d metachat -c < /home/deploy/backups/meta-chat/backup-20250109-120000.dump
```

**Automated Backup Script:**
```bash
#!/bin/bash
# /home/deploy/scripts/backup-meta-chat.sh

BACKUP_DIR="/home/deploy/backups/meta-chat"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d-%H%M%S)

# Create backup
docker exec meta-chat-postgres pg_dump -U metachat -d metachat -Fc > "${BACKUP_DIR}/db-backup-${DATE}.dump"

# Backup storage directory
tar -czf "${BACKUP_DIR}/storage-backup-${DATE}.tar.gz" /home/deploy/meta-chat-platform/storage

# Remove old backups
find "${BACKUP_DIR}" -name "db-backup-*.dump" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "storage-backup-*.tar.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: ${DATE}"
```

**Add to Crontab:**
```bash
# Edit crontab
crontab -e

# Add daily backup at 3 AM
0 3 * * * /home/deploy/scripts/backup-meta-chat.sh >> /home/deploy/logs/backup.log 2>&1
```

**Verify Backup:**
```bash
# Check backup file size
ls -lh /home/deploy/backups/meta-chat/

# Test restore to temporary database
createdb -h localhost -U metachat metachat_test
pg_restore -h localhost -U metachat -d metachat_test /home/deploy/backups/meta-chat/backup-20250109-120000.dump
dropdb -h localhost -U metachat metachat_test
```

### Data Retention Policy

- Default retention: **90 days for messages**, **30 days for API logs**
- Jobs run via `scheduleDataRetentionJobs` nightly at 03:00 UTC (configurable cron)
- Enable archival by specifying `archiveTable` (e.g., `messages_archive`) before deletion
- Tenants can override defaults through `TenantSettings.retention`

---

## 📊 Resource Estimates

### Expected Memory Usage

| Service | Expected RAM |
|---------|--------------|
| PostgreSQL | 200-400MB |
| Redis | 50-100MB |
| RabbitMQ | 100-200MB |
| API Server | 300-500MB |
| Dashboard | 50MB |
| **Total** | **~1-1.5GB** |

**System Impact:** With 5.4GB available and existing services using ~3.2GB, this will fit comfortably.

### Expected Disk Usage

- Application code: ~500MB
- Node modules: ~1GB
- PostgreSQL data: ~1-10GB (grows with usage)
- Redis data: ~100MB
- Storage uploads: Variable (depends on documents)
- **Estimate:** ~5-15GB total

---

## 🔄 Integration with Existing Services

### N8N Integration Opportunities

The Meta Chat Platform can integrate with existing N8N workflows:

- **Webhook triggers** → N8N workflows
- **Message events** → N8N automation
- **Document processing** → N8N pipelines
- **Shared OpenAI credentials**

### Nextcloud Integration

- Store uploaded documents in Nextcloud instead of local filesystem
- Share chat transcripts as files

### Netdata Monitoring

Add Meta Chat services to Netdata dashboard:
- PostgreSQL metrics
- Redis metrics
- API server health
- Message throughput

---

## 🚨 Risk Mitigation

### Potential Issues

1. **Port conflicts** → All bound to localhost, no conflicts expected
2. **Memory pressure** → 5.4GB available, 1.5GB needed = safe margin
3. **Disk space** → 370GB available, project needs <15GB
4. **OpenAI costs** → Rate limiting implemented, monitor usage
5. **Database performance** → pgvector indexes, connection pooling

### Rollback Plan

If deployment fails:
```bash
# Stop services
docker-compose down

# Remove containers
docker-compose rm -f

# Clean volumes (if needed)
docker volume prune

# Restore backup (if any)
```

No impact on existing services (N8N, Nextcloud, etc.)

---

## 📝 Post-Deployment Tasks

### Validation

1. [ ] API health check responds 200 OK
2. [ ] Dashboard loads successfully
3. [ ] Can create tenant via API
4. [ ] Database queries work
5. [ ] Redis cache operational
6. [ ] OpenAI API calls succeed
7. [ ] Webhooks reachable from internet

### Documentation

1. [ ] Update main README with deployment status
2. [ ] Document API endpoints and usage
3. [ ] Create admin guide for dashboard
4. [ ] Document backup/restore procedures

### Monitoring

1. [ ] Set up log aggregation
2. [ ] Configure error alerts
3. [ ] Monitor resource usage trends
4. [ ] Track API response times

---

## 🎯 Next Steps

**Immediate Actions:**
1. Review this deployment plan
2. Confirm domain names (`chat.genai.hr`, `chat-admin.genai.hr`)
3. Obtain/confirm OpenAI API key
4. Generate secure passwords for databases
5. Begin Phase 1: Infrastructure Setup

**Build Priority (from README):**
1. ✅ Shared package (COMPLETE)
2. ✅ Database package (COMPLETE)
3. ✅ Events package (COMPLETE)
4. 📦 RAG engine (TODO)
5. 📦 Channel adapters (TODO)
6. 📦 Orchestrator (TODO)
7. 📦 API server (TODO)
8. 📦 Dashboard (TODO)

**Timeline Estimate:**
- Infrastructure setup: 1-2 hours
- Application build: 2-4 weeks (development)
- Testing & validation: 1 week
- Production deployment: 1 day

---

## 📞 Support & Resources

- **System Access:** SSH via Tailscale or public IP
- **Existing Services:** N8N, Nextcloud, Portainer all accessible
- **Documentation:** This file + main README.md + ARCHITECTURE.md
- **GitHub Repo:** https://github.com/Wandeon/meta-chat-platform

---

**Deployment Status:** 🟡 Planning Phase
**System Readiness:** ✅ Fully Compatible
**Risk Level:** 🟢 Low (isolated deployment, no impact on existing services)

---

**Last Updated:** 2025-10-08
**Next Review:** After infrastructure setup completion
