# Production Deployment Checklist - Meta Chat Platform

Last Updated: 2025-11-19
Environment: Production (chat.genai.hr)

## Security Configuration

### CORS & Headers
- [x] CORS origins configured (not wildcard)
  Location: /home/deploy/meta-chat-platform/apps/api/.env.production
  Value: API_CORS_ORIGINS=https://chat.genai.hr,https://www.chat.genai.hr

- [x] Security headers configured in Caddyfile
  Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options

### SMTP Configuration
- [ ] SMTP credentials configured
  Guide: /home/deploy/meta-chat-platform/SMTP_SETUP_GUIDE.md

## Performance Configuration

- [x] Database connection pooling: max_pool_size=20
- [x] Redis caching configured
- [x] RabbitMQ message queue running
- [x] PM2 log rotation: 10M max, 30-day retention

## Monitoring & Observability

- [x] Health check endpoint: GET /health
- [x] Metrics endpoint: GET /metrics (localhost only)
- [x] Application logs enabled via PM2
- [x] Access logs in /var/log/caddy/metachat-access.log
- [x] Cost tracking enabled (LLM)

## Services Status

- [x] API server (meta-chat-api): Port 3000
- [x] Worker service (meta-chat-worker): Background tasks
- [x] Caddy reverse proxy: SSL termination
- [x] PostgreSQL database: Connection pooling enabled
- [x] Redis cache: Socket.IO adapter
- [x] RabbitMQ: Message queue

## Backup & Disaster Recovery

- [x] Backup script: /home/deploy/backup-database.sh
- [x] Backup schedule: Daily at 2 AM
- [x] Backup retention: 30 days
- [x] Backup location: /home/deploy/backups/

## SSL/TLS Certificates

- [x] SSL certificate: Let
- [x] Auto-renewal: Enabled via Caddy

## Documentation

- [x] SMTP setup guide: /home/deploy/meta-chat-platform/SMTP_SETUP_GUIDE.md
- [x] Environment variables documented

Status: Configuration Complete - Ready for Final Testing
