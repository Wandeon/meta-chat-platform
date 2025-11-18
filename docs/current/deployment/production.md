# Production Deployment - VPS-00 (chat.genai.hr)

**Last Updated:** 2025-11-18  
**Status:** ✅ Current  
**Maintainer:** Infrastructure Team

## Overview

Complete production deployment documentation for Meta Chat Platform on VPS-00 (chat.genai.hr).

**Deployment Details:**
- **Server:** VPS-00 (100.97.156.41) - AMD EPYC 4 cores, 7.8GB RAM
- **Domain:** chat.genai.hr
- **User:** deploy
- **Directory:** /home/deploy/meta-chat-platform
- **Node:** 20.19.5
- **PM2:** Process manager (as deploy user)
- **Proxy:** Caddy 2.x with automatic HTTPS

## Architecture

```
Internet (HTTPS:443)
        ↓
   Caddy Server
   - SSL termination
   - Reverse proxy
   - Security headers
        ↓
   PM2 Applications
   - API Server (port 3000)
   - Worker Process
        ↓
   Docker Services (localhost only)
   - PostgreSQL (5432)
   - Redis (6379)  
   - RabbitMQ (5672, 15672)
```

## Current Deployment State

**PM2 Processes:**
```bash
sudo -u deploy pm2 list

# Running:
# meta-chat-api     - Port 3000, online
# meta-chat-worker  - Background jobs, online
```

**Docker Containers:**
```bash
docker ps --filter name=meta-chat

# Running:
# meta-chat-postgres  - PostgreSQL 15 + pgvector
# meta-chat-redis     - Redis 7
# meta-chat-rabbitmq  - RabbitMQ 3
```

## Deployment Process

### 1. Pre-Deployment

```bash
# SSH to server
ssh admin@100.97.156.41

# Switch to deploy user
sudo su - deploy

# Navigate to project
cd /home/deploy/meta-chat-platform

# Check status
git status
git log -1
```

### 2. Pull Changes

```bash
# Fetch and pull
git fetch origin
git pull origin main

# Review changes
git diff HEAD@{1}..HEAD
```

### 3. Install & Build

```bash
# Install dependencies
npm install

# Build all apps and packages
npm run build
```

### 4. Database Migrations

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

### 5. Restart Services

```bash
# Reload PM2 (zero-downtime)
pm2 reload ecosystem.config.js

# Or restart (brief downtime)
pm2 restart ecosystem.config.js

# Check status
pm2 list
pm2 logs --lines 50
```

### 6. Verify Deployment

```bash
# Health check
curl https://chat.genai.hr/health

# Check logs
pm2 logs meta-chat-api --lines 20 --nostream
pm2 logs meta-chat-worker --lines 20 --nostream

# Verify Docker services
docker ps --filter name=meta-chat
docker exec meta-chat-postgres pg_isready
docker exec meta-chat-redis redis-cli ping
```

### Rollback

```bash
# Stop processes
pm2 stop all

# Checkout previous commit
git log --oneline -10
git checkout <previous-commit-hash>

# Rebuild
npm install
npm run build

# Restart
pm2 restart ecosystem.config.js

# Verify
curl https://chat.genai.hr/health
```

## Configuration

### PM2 Configuration

**File:** /home/deploy/meta-chat-platform/ecosystem.config.js

**meta-chat-api:**
- Script: apps/api/dist/server.js
- Port: 3000
- Mode: fork (single instance)
- Memory limit: 500MB
- Auto-restart: Yes (max 10 times)
- Min uptime: 10s

**meta-chat-worker:**
- Script: apps/worker/dist/index.js
- Mode: fork (single instance)  
- Memory limit: 500MB
- Auto-restart: Yes (max 10 times)
- Min uptime: 10s

### Environment Variables

**File:** /home/deploy/meta-chat-platform/apps/api/.env.production

**Key Configuration:**
```bash
NODE_ENV=production
PORT=3000
API_URL=https://chat.genai.hr

DATABASE_URL=postgresql://metachat:***@localhost:5432/metachat
REDIS_URL=redis://localhost:6379/0
RABBITMQ_URL=amqp://metachat:***@localhost:5672

LLM_PROVIDER=openai
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

ENCRYPTION_KEY=***
ADMIN_JWT_SECRET=***
ADMIN_KEY_PEPPER=***

STORAGE_PATH=./storage
LOG_LEVEL=info
```

**Security:** Actual credentials are never committed to git. See .env.production.example for template.

### Port Bindings

| Service | Port | Bind | Access |
|---------|------|------|--------|
| API | 3000 | 0.0.0.0 | Via Caddy proxy |
| PostgreSQL | 5432 | 127.0.0.1 | Localhost only |
| Redis | 6379 | 127.0.0.1 | Localhost only |
| RabbitMQ | 5672 | 127.0.0.1 | Localhost only |
| RabbitMQ UI | 15672 | 127.0.0.1 | Localhost only |

## Operations

### Managing PM2

```bash
# Start
pm2 start ecosystem.config.js

# Stop
pm2 stop all
pm2 stop meta-chat-api

# Restart
pm2 restart all
pm2 restart meta-chat-api

# Reload (zero-downtime)
pm2 reload all

# Delete
pm2 delete all

# View logs
pm2 logs
pm2 logs meta-chat-api
pm2 logs --lines 100

# Monitor
pm2 monit

# Process info
pm2 info meta-chat-api

# Save process list
pm2 save
```

### Viewing Logs

**PM2 Logs:**
```bash
# Real-time
pm2 logs

# Specific app
pm2 logs meta-chat-api
pm2 logs meta-chat-worker

# Last N lines
pm2 logs --lines 100 --nostream

# Error logs only
pm2 logs --err

# Log files
ls -lh /home/deploy/meta-chat-platform/logs/
tail -f /home/deploy/meta-chat-platform/logs/api-out.log
```

**Caddy Logs:**
```bash
# Access logs
sudo tail -f /var/log/caddy/metachat-access.log

# Error logs
sudo journalctl -u caddy -f

# Status
sudo systemctl status caddy
```

**Docker Logs:**
```bash
# PostgreSQL
docker logs meta-chat-postgres --tail 50 -f

# Redis
docker logs meta-chat-redis --tail 50 -f

# RabbitMQ
docker logs meta-chat-rabbitmq --tail 50 -f
```

### Health Checks

**API Health:**
```bash
curl https://chat.genai.hr/health

# Expected:
{
  "status": "ok",
  "timestamp": "2025-11-18T...",
  "uptime": 1234
}
```

**Database Health:**
```bash
# PostgreSQL
docker exec meta-chat-postgres pg_isready

# Redis
docker exec meta-chat-redis redis-cli ping

# RabbitMQ
docker exec meta-chat-rabbitmq rabbitmqctl status
```

**Resource Usage:**
```bash
# PM2
pm2 monit

# System
htop
df -h
free -h

# Docker
docker stats meta-chat-postgres meta-chat-redis meta-chat-rabbitmq
```

### Database Operations

**Prisma:**
```bash
cd /home/deploy/meta-chat-platform

# Generate client
npm run db:generate

# Run migrations
npm run db:migrate

# Prisma Studio
npm run db:studio  # http://localhost:5555
```

**Backups:**
```bash
# Create backup
docker exec meta-chat-postgres pg_dump -U metachat metachat >   backup-$(date +%Y%m%d-%H%M%S).sql

# Restore backup
cat backup.sql | docker exec -i meta-chat-postgres psql -U metachat -d metachat

# Check size
docker exec meta-chat-postgres psql -U metachat -d metachat -c   "SELECT pg_size_pretty(pg_database_size('metachat'));"
```

## Troubleshooting

### API Not Responding

```bash
# 1. Check PM2
pm2 list
pm2 logs meta-chat-api --lines 50

# 2. Check port
ss -tlnp | grep 3000

# 3. Test local
curl http://localhost:3000/health

# 4. Check Caddy
sudo systemctl status caddy
sudo journalctl -u caddy -n 50

# 5. Restart
pm2 restart meta-chat-api
```

### Database Issues

```bash
# 1. Check container
docker ps --filter name=meta-chat-postgres

# 2. Check logs
docker logs meta-chat-postgres --tail 100

# 3. Test connection
docker exec meta-chat-postgres pg_isready

# 4. Restart if needed
docker restart meta-chat-postgres
```

### Worker Issues

```bash
# 1. Check status
pm2 logs meta-chat-worker --lines 50

# 2. Check RabbitMQ
docker exec meta-chat-rabbitmq rabbitmqctl list_queues

# 3. Restart
pm2 restart meta-chat-worker
```

### High Memory

```bash
# 1. Check usage
pm2 list

# 2. Check for leaks
pm2 logs --lines 200 | grep -i memory

# 3. Restart if needed
pm2 restart all
```

### Disk Space

```bash
# 1. Check usage
df -h

# 2. Check log sizes
du -sh /home/deploy/meta-chat-platform/logs/
ls -lh /home/deploy/meta-chat-platform/logs/

# 3. Rotate logs
pm2 install pm2-logrotate

# 4. Manual cleanup
pm2 flush  # Clear all logs
```

## Code References

### Key Files

| Path | Description |
|------|-------------|
| /home/deploy/meta-chat-platform/ecosystem.config.js | PM2 config |
| /home/deploy/meta-chat-platform/apps/api/.env.production | Environment variables |
| /home/deploy/meta-chat-platform/apps/api/dist/server.js | API entry point |
| /home/deploy/meta-chat-platform/apps/worker/dist/index.js | Worker entry point |
| /home/deploy/meta-chat-platform/packages/database/prisma/schema.prisma | Database schema |
| /home/deploy/meta-chat-platform/logs/ | Application logs |
| /home/deploy/meta-chat-platform/storage/ | Uploaded documents |
| /etc/caddy/Caddyfile | Reverse proxy config |

### URLs

| URL | Description |
|-----|-------------|
| https://chat.genai.hr | Public API endpoint |
| https://chat.genai.hr/health | Health check |
| https://chat.genai.hr/api/* | REST API routes |
| https://chat.genai.hr/socket.io/* | WebSocket |
| http://localhost:15672 | RabbitMQ UI (localhost) |

## Related Documentation

- [Development Setup](./development.md) - Local development
- [Infrastructure](./infrastructure.md) - Server infrastructure
- [Architecture Overview](../../README.md) - System architecture
- [Deployment Guide](../../DEPLOYMENT-GUIDE.md) - Detailed procedures
