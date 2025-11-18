# Infrastructure - Meta Chat Platform

**Last Updated:** 2025-11-18  
**Status:** ✅ Current  
**Maintainer:** Infrastructure Team

## Overview

Complete infrastructure setup for Meta Chat Platform on VPS-00 (chat.genai.hr).

**Server:**
- Hostname: VPS-00
- IP: 100.97.156.41
- CPU: AMD EPYC 4 cores
- RAM: 7.8GB
- Disk: 370GB available
- OS: Debian 12

## Architecture

```
Internet → Caddy (443) → PM2 Apps (3000) → Docker Services
                                            ├─ PostgreSQL (5432)
                                            ├─ Redis (6379)
                                            └─ RabbitMQ (5672, 15672)
```

## Services

| Service | Type | Port | Status |
|---------|------|------|--------|
| Caddy | System | 80, 443 | Running |
| meta-chat-api | PM2 | 3000 | Running |
| meta-chat-worker | PM2 | - | Running |
| PostgreSQL | Docker | 5432 | Running |
| Redis | Docker | 6379 | Running |
| RabbitMQ | Docker | 5672, 15672 | Running |

## Database Infrastructure

### PostgreSQL with pgvector

**Container:** meta-chat-postgres

```bash
# Backup
docker exec meta-chat-postgres pg_dump -U metachat metachat > backup.sql

# Restore
cat backup.sql | docker exec -i meta-chat-postgres psql -U metachat -d metachat

# Check size
docker exec meta-chat-postgres psql -U metachat -d metachat -c   "SELECT pg_size_pretty(pg_database_size('metachat'));"

# Vacuum
docker exec meta-chat-postgres psql -U metachat -d metachat -c "VACUUM ANALYZE;"
```

**Database Schema:**
- Multi-tenant with tenant isolation
- Vector embeddings (pgvector)
- Partitioned messages and logs
- Encrypted secrets storage

### Redis Cache

**Container:** meta-chat-redis

```bash
# Health check
docker exec meta-chat-redis redis-cli ping

# Monitor
docker exec -it meta-chat-redis redis-cli monitor

# Memory info
docker exec meta-chat-redis redis-cli INFO memory

# Connected clients
docker exec meta-chat-redis redis-cli CLIENT LIST
```

**Usage:**
- Session storage
- Rate limiting
- Caching
- Socket.IO adapter

### RabbitMQ Message Queue

**Container:** meta-chat-rabbitmq

```bash
# Status
docker exec meta-chat-rabbitmq rabbitmqctl status

# List queues
docker exec meta-chat-rabbitmq rabbitmqctl list_queues

# List connections
docker exec meta-chat-rabbitmq rabbitmqctl list_connections

# Management UI (via SSH tunnel)
ssh -L 15672:localhost:15672 admin@100.97.156.41
# Then: http://localhost:15672
```

**Queues:**
- message.inbound - Incoming messages
- message.outbound - Outgoing messages
- webhook.delivery - Webhook deliveries
- document.processing - Document jobs
- llm.requests - LLM processing

## Reverse Proxy - Caddy

**Config:** /etc/caddy/Caddyfile

**Management:**
```bash
# Status
sudo systemctl status caddy

# Reload config (no downtime)
sudo systemctl reload caddy

# Restart
sudo systemctl restart caddy

# View logs
sudo journalctl -u caddy -f
sudo tail -f /var/log/caddy/metachat-access.log

# Validate config
caddy validate --config /etc/caddy/Caddyfile
```

**SSL/TLS:**
- Automatic Let's Encrypt certificates
- Auto-renewal handled by Caddy
- Certificates location: /var/lib/caddy/

## Monitoring

### Health Checks

```bash
# API health
curl https://chat.genai.hr/health

# PM2 processes
sudo -u deploy pm2 list

# Docker containers
docker ps --filter name=meta-chat

# Database
docker exec meta-chat-postgres pg_isready

# Redis
docker exec meta-chat-redis redis-cli ping

# RabbitMQ
docker exec meta-chat-rabbitmq rabbitmqctl status
```

### Resource Monitoring

```bash
# System resources
htop
df -h
free -h

# PM2 monitoring
sudo -u deploy pm2 monit

# Docker stats
docker stats meta-chat-postgres meta-chat-redis meta-chat-rabbitmq

# Network
ss -tlnp
```

### Log Files

| Service | Location |
|---------|----------|
| API | /home/deploy/meta-chat-platform/logs/api-out.log |
| Worker | /home/deploy/meta-chat-platform/logs/worker-out.log |
| Caddy | /var/log/caddy/metachat-access.log |
| PostgreSQL | docker logs meta-chat-postgres |
| Redis | docker logs meta-chat-redis |
| RabbitMQ | docker logs meta-chat-rabbitmq |

## Backup & Recovery

### Database Backups

**Automated (cron):**
```bash
# Daily backup at 2 AM
0 2 * * * docker exec meta-chat-postgres pg_dump -U metachat metachat |   gzip > /home/deploy/backups/metachat-$(date +\%Y\%m\%d).sql.gz

# Cleanup old backups (30 days)
0 3 * * * find /home/deploy/backups/ -name "metachat-*.sql.gz" -mtime +30 -delete
```

**Manual:**
```bash
# Full backup
docker exec meta-chat-postgres pg_dump -U metachat metachat >   /home/deploy/backups/metachat-$(date +%Y%m%d-%H%M%S).sql

# Compressed
docker exec meta-chat-postgres pg_dump -U metachat metachat |   gzip > /home/deploy/backups/metachat-$(date +%Y%m%d-%H%M%S).sql.gz
```

**Restore:**
```bash
# From backup
cat /path/to/backup.sql |   docker exec -i meta-chat-postgres psql -U metachat -d metachat

# From compressed
gunzip -c /path/to/backup.sql.gz |   docker exec -i meta-chat-postgres psql -U metachat -d metachat
```

## Security

### Firewall
```bash
# Check status
sudo ufw status verbose

# Allowed ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)
# All database ports bound to localhost only
```

### SSL/TLS
- Automatic Let's Encrypt via Caddy
- HTTPS enforced with HSTS
- Security headers configured

### Access Control
- SSH key authentication only
- Database services localhost-bound
- Admin JWT authentication
- API key authentication
- Rate limiting enabled

## Maintenance

**Weekly:**
- Review logs for errors
- Check disk space
- Monitor memory usage

**Monthly:**
- Update system packages
- Archive old backups
- Vacuum PostgreSQL
- Review SSL certificates

**Updates:**
```bash
# System
sudo apt-get update && sudo apt-get upgrade -y

# Docker images
cd /home/deploy/meta-chat-platform/docker
docker-compose pull
docker-compose down && docker-compose up -d
```

## Related Documentation

- [Production Deployment](./production.md)
- [Development Setup](./development.md)
- [Architecture Overview](../../README.md)
