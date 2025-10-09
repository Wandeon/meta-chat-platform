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
├── docker-compose.yml          # All services
├── .env                        # Environment variables
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
- [ ] **3.2** Enable pgvector extension
- [ ] **3.3** Start Redis and verify connection
- [ ] **3.4** Start API server and health check
- [ ] **3.5** Start Dashboard and verify access

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
      dockerfile: apps/api/Dockerfile
    container_name: meta-chat-api
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/metachat
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://${RABBITMQ_USER:-admin}:${RABBITMQ_PASS}@rabbitmq:5672
    volumes:
      - ./storage:/app/storage
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      - postgres
      - redis
      - rabbitmq
    networks:
      - meta-chat-network

  dashboard:
    build:
      context: .
      dockerfile: apps/dashboard/Dockerfile
    container_name: meta-chat-dashboard
    restart: unless-stopped
    environment:
      API_URL: https://chat.genai.hr
    ports:
      - "127.0.0.1:3001:80"
    networks:
      - meta-chat-network

networks:
  meta-chat-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  rabbitmq-data:
```

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
