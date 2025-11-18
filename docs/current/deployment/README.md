# Current Deployment Documentation

**Last Updated:** 2025-11-18  
**Status:** ✅ Current  

## Documentation Files

- [production.md](./production.md) - Complete production deployment on VPS-00
- [development.md](./development.md) - Local development setup guide
- [infrastructure.md](./infrastructure.md) - Server infrastructure, database, reverse proxy

## Quick Links

**Production Environment:**
- Server: VPS-00 (100.97.156.41)
- Domain: https://chat.genai.hr
- Process Manager: PM2 (as deploy user)
- Reverse Proxy: Caddy
- Database: PostgreSQL 15 + pgvector (Docker)
- Cache: Redis 7 (Docker)
- Message Queue: RabbitMQ (Docker)

**Key Directories:**
- Application: /home/deploy/meta-chat-platform
- Logs: /home/deploy/meta-chat-platform/logs/
- Storage: /home/deploy/meta-chat-platform/storage/
- Caddy Config: /etc/caddy/Caddyfile

**Quick Commands:**
```bash
# Check deployment status
sudo -u deploy pm2 list
docker ps --filter name=meta-chat

# View logs
pm2 logs meta-chat-api
pm2 logs meta-chat-worker

# Health check
curl https://chat.genai.hr/health
```

See individual documentation files for detailed information.
