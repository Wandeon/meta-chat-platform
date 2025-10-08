# System Constraints & Guidelines

**Target System:** genai.hr VPS
**Purpose:** Quick reference for development decisions

---

## ✅ What We CAN Do

### Available Resources
- ✅ **4 CPU cores** - plenty for Node.js + PostgreSQL
- ✅ **5.4GB RAM free** - sufficient for all services (~1.5GB needed)
- ✅ **370GB disk space** - more than enough
- ✅ **Node.js 20.19.5** - exact version requirement met
- ✅ **Docker & Docker Compose** - ready for containerization
- ✅ **Nginx reverse proxy** - can route new domains
- ✅ **Let's Encrypt SSL** - can add new domains

### Available Ports
- ✅ **3000-5677** (except 5678 - used by N8N)
- ✅ **5679-8079**
- ✅ **8081-8999**
- ✅ **9001-19998**
- ✅ **5432** (PostgreSQL) - available
- ✅ **6379** (Redis) - available
- ✅ **5672** (RabbitMQ) - available

### Available Domains
Pattern: `*.genai.hr`
- ✅ `chat.genai.hr` - for API
- ✅ `chat-admin.genai.hr` - for dashboard
- ✅ Any other `*.genai.hr` subdomain

---

## ⚠️ What We MUST AVOID

### Reserved Ports (DO NOT USE)
- ❌ **22** - SSH
- ❌ **80, 443** - Nginx (public)
- ❌ **5678** - N8N
- ❌ **8080** - Nextcloud
- ❌ **9000, 9443** - Portainer
- ❌ **19999** - Netdata
- ❌ **3306** - MariaDB (internal to Nextcloud)

### Reserved Domains
- ❌ `app.genai.hr` - N8N
- ❌ `files.genai.hr` - Nextcloud
- ❌ `docker.genai.hr` - Portainer
- ❌ `monitor.genai.hr` - Netdata

### Docker Networks (Avoid naming conflicts)
- ❌ `n8n_default`
- ❌ `nextcloud_default`
- ❌ `appsmith_default`
- ❌ `ollama_default`

### System Impacts to Avoid
- ❌ **High memory apps** (Nextcloud already uses 2GB)
- ❌ **Exposing services to 0.0.0.0** (use 127.0.0.1 + nginx)
- ❌ **Installing system packages** (use Docker when possible)
- ❌ **Modifying existing services** without backup

---

## 🎯 Deployment Requirements

### Required New Services
- 📦 **PostgreSQL 15+** with pgvector - NOT installed
- 📦 **Redis 7+** - NOT installed
- 🔵 **RabbitMQ 3+** - Optional (can start without)

### Required Credentials
- 🔑 **OpenAI API key** - Check if exists in N8N `.env`
- 🔑 **PostgreSQL password** - Generate new
- 🔑 **Redis password** - Optional but recommended
- 🔑 **RabbitMQ credentials** - Generate new
- 🔑 **Global API key** - Generate new (32+ chars)
- 🔑 **WhatsApp/Messenger tokens** - Per-tenant (later)

---

## 📐 Architecture Decisions

### ✅ ALWAYS Do This

**1. Use Docker Compose**
```yaml
# All services in one compose file
# Store in: /home/deploy/meta-chat-platform/docker-compose.yml
```

**2. Bind to Localhost**
```yaml
ports:
  - "127.0.0.1:3000:3000"  # ✅ Good
  - "0.0.0.0:3000:3000"    # ❌ Bad
```

**3. Use Nginx Reverse Proxy**
```nginx
# /etc/nginx/sites-available/chat.genai.hr
location / {
    proxy_pass http://127.0.0.1:3000;
}
```

**4. Isolate Docker Networks**
```yaml
networks:
  meta-chat-network:  # ✅ Unique name
    driver: bridge
```

**5. Store Data in Project Directory**
```
/home/deploy/meta-chat-platform/
├── postgres-data/     # PostgreSQL volume
├── redis-data/        # Redis volume
├── storage/           # Uploaded files
└── backups/           # Database dumps
```

**6. Use Environment Variables**
```bash
# .env file (NOT committed to git)
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."
```

### ❌ NEVER Do This

**1. Don't Expose Databases Publicly**
```yaml
# ❌ BAD
postgres:
  ports:
    - "5432:5432"  # Exposed to internet

# ✅ GOOD
postgres:
  ports:
    - "127.0.0.1:5432:5432"  # Localhost only
```

**2. Don't Use Port 8080**
```yaml
# ❌ BAD - Conflicts with Nextcloud
api:
  ports:
    - "8080:8080"

# ✅ GOOD
api:
  ports:
    - "127.0.0.1:3000:3000"
```

**3. Don't Hardcode Secrets**
```typescript
// ❌ BAD
const apiKey = "sk-abc123...";

// ✅ GOOD
const apiKey = process.env.OPENAI_API_KEY;
```

**4. Don't Install System-Wide npm Packages**
```bash
# ❌ BAD
sudo npm install -g some-package

# ✅ GOOD - Use in project
npm install some-package
# or use Docker
```

**5. Don't Modify Nginx Main Config**
```bash
# ❌ BAD
sudo nano /etc/nginx/nginx.conf

# ✅ GOOD - Use sites-available
sudo nano /etc/nginx/sites-available/chat.genai.hr
```

---

## 🔒 Security Best Practices

### Required Security Measures

1. **All database connections localhost-only**
   ```yaml
   postgres:
     ports:
       - "127.0.0.1:5432:5432"
   ```

2. **SSL/TLS for all public endpoints**
   ```bash
   sudo certbot --nginx -d chat.genai.hr
   ```

3. **Strong random passwords**
   ```bash
   openssl rand -hex 32  # For GLOBAL_API_KEY
   openssl rand -base64 24  # For DB passwords
   ```

4. **Environment file security**
   ```bash
   chmod 600 .env
   # Add .env to .gitignore
   ```

5. **Rate limiting on API**
   ```typescript
   // Already in project requirements
   RATE_LIMIT_WINDOW_MS="60000"
   RATE_LIMIT_MAX_REQUESTS="100"
   ```

---

## 📊 Resource Budgets

### Memory Budget (Total: 5.4GB available)

| Service | Max Allowed |
|---------|-------------|
| PostgreSQL | 500MB |
| Redis | 200MB |
| RabbitMQ | 200MB |
| API Server | 600MB |
| Dashboard | 100MB |
| **Reserve** | **3.9GB** (for spikes + system) |

**Rule:** If any service exceeds budget, investigate before scaling up.

### Disk Budget (Total: 370GB available)

| Component | Max Allowed |
|-----------|-------------|
| Application code | 2GB |
| Node modules | 2GB |
| PostgreSQL data | 50GB |
| Redis persistence | 1GB |
| Storage uploads | 100GB |
| Backups | 20GB |
| **Reserve** | **195GB** |

**Rule:** Set up disk usage alerts at 250GB total.

### CPU Budget (Total: 4 cores)

| Service | Target % |
|---------|----------|
| PostgreSQL | <30% per core |
| API Server | <40% per core |
| Other services | <20% per core |

**Rule:** If sustained >70% on any core, optimize or scale.

---

## 🔄 Integration Patterns

### Nginx Proxy Template

```nginx
server {
    listen 443 ssl http2;
    server_name SERVICE.genai.hr;

    ssl_certificate     /etc/letsencrypt/live/SERVICE.genai.hr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/SERVICE.genai.hr/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:PORT;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Docker Compose Service Template

```yaml
service-name:
  build: ./path
  container_name: meta-chat-service-name
  restart: unless-stopped
  env_file: .env
  ports:
    - "127.0.0.1:PORT:PORT"
  volumes:
    - ./data:/app/data
  networks:
    - meta-chat-network
  depends_on:
    - postgres
    - redis
```

---

## 🚨 Red Flags (Stop and Review)

**STOP if you see:**
- ❌ Any service exposed on `0.0.0.0` (except via nginx)
- ❌ Memory usage >80% sustained
- ❌ Disk usage >350GB
- ❌ CPU >90% sustained
- ❌ Port conflicts with existing services
- ❌ Docker network conflicts
- ❌ Secrets in git commits
- ❌ Unencrypted external communication

---

## ✅ Green Lights (Safe to Proceed)

**PROCEED if:**
- ✅ All services bind to 127.0.0.1
- ✅ Nginx configs use SSL
- ✅ Docker network is isolated
- ✅ Environment variables used for secrets
- ✅ Resource usage within budgets
- ✅ Backup strategy in place
- ✅ No conflicts with existing services

---

## 📝 Pre-Deployment Checklist

Before deploying ANY new service:

- [ ] Port not in reserved list
- [ ] Memory budget available
- [ ] Disk space sufficient
- [ ] Domain not already used
- [ ] Docker network name unique
- [ ] All secrets in .env file
- [ ] Services bound to localhost
- [ ] Nginx config created
- [ ] SSL certificate obtainable
- [ ] Backup strategy defined
- [ ] Rollback plan documented

---

## 🛠️ Development Guidelines

### When Adding New Features

**Always:**
- Use TypeScript strict mode
- Add proper error handling
- Log with structured JSON
- Validate all inputs
- Use Prisma for database access
- Follow existing code patterns

**Never:**
- Bypass authentication
- Skip input validation
- Hardcode credentials
- Ignore errors silently
- Break existing APIs
- Modify shared packages without considering impact

### Testing Requirements

**Before Production:**
- [ ] Unit tests for core logic
- [ ] Integration tests for APIs
- [ ] Load test with expected traffic
- [ ] Security scan for vulnerabilities
- [ ] Manual testing of critical paths

---

## 📞 Emergency Contacts

**If Something Breaks:**

1. **Check service status:**
   ```bash
   docker-compose ps
   docker-compose logs -f service-name
   ```

2. **Check nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

3. **Check system resources:**
   ```bash
   free -h
   df -h
   docker stats
   ```

4. **Rollback:**
   ```bash
   docker-compose down
   # Restore from backup
   ```

5. **Monitor:**
   - Netdata: https://monitor.genai.hr
   - Docker: https://docker.genai.hr

---

**Remember:** This system hosts PRODUCTION services (N8N, Nextcloud). Always test in development first, have backups, and be ready to rollback.

---

**Last Updated:** 2025-10-08
