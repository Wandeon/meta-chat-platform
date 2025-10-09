# Production Deployment Guide

This guide covers deploying Meta Chat Platform to a production environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [SSL Certificate Setup](#ssl-certificate-setup)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Application Deployment](#application-deployment)
7. [Monitoring Setup](#monitoring-setup)
8. [Backup Configuration](#backup-configuration)
9. [Maintenance & Operations](#maintenance--operations)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **OS**: Ubuntu 22.04 LTS or Debian 12 (recommended)
- **CPU**: 4+ cores (8+ cores recommended for production)
- **RAM**: 8GB minimum (16GB+ recommended)
- **Disk**: 100GB+ SSD storage
- **Network**: Public IP address, ports 80, 443 accessible

### Required Software

- Node.js 18+ (LTS)
- PostgreSQL 15+
- Redis 7+
- RabbitMQ 3.12+
- Nginx 1.22+
- PM2 (process manager)
- Certbot (SSL certificates)

---

## Server Setup

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential
```

### 2. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2 pnpm
```

### 3. Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE metachat_prod;
CREATE USER metachat_user WITH ENCRYPTED PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE metachat_prod TO metachat_user;
\c metachat_prod
GRANT ALL ON SCHEMA public TO metachat_user;
CREATE EXTENSION IF NOT EXISTS vector;
EOF
```

### 4. Install Redis

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Configure Redis authentication
sudo bash -c 'echo "requirepass CHANGE_ME_REDIS_PASSWORD" >> /etc/redis/redis.conf'
sudo systemctl restart redis-server
```

### 5. Install RabbitMQ

```bash
sudo apt install -y rabbitmq-server
sudo systemctl enable rabbitmq-server
sudo systemctl start rabbitmq-server

# Enable management plugin
sudo rabbitmq-plugins enable rabbitmq_management

# Create RabbitMQ user
sudo rabbitmqctl add_user metachat CHANGE_ME_RABBITMQ_PASSWORD
sudo rabbitmqctl set_permissions -p / metachat ".*" ".*" ".*"
sudo rabbitmqctl set_user_tags metachat administrator
```

### 6. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 7. Create Deployment User

```bash
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG sudo deploy
sudo mkdir -p /var/log/metachat /var/lib/metachat/storage
sudo chown -R deploy:deploy /var/log/metachat /var/lib/metachat
```

---

## SSL Certificate Setup

### Automated Setup with Script

```bash
# Switch to deploy user
sudo su - deploy

# Clone repository
cd /home/deploy
git clone https://github.com/yourusername/meta-chat-platform.git
cd meta-chat-platform

# Set domain and email
export DOMAIN=chat.genai.hr
export SSL_EMAIL=admin@genai.hr

# Run SSL setup script
sudo ./scripts/setup-ssl.sh
```

### Manual Setup (if needed)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --webroot \
  -w /var/www/letsencrypt \
  -d chat.genai.hr \
  -d www.chat.genai.hr \
  --email admin@genai.hr \
  --agree-tos \
  --no-eff-email

# Install Nginx configuration
sudo cp infrastructure/nginx/metachat.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/metachat.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Environment Configuration

### 1. Generate Secrets

```bash
cd /home/deploy/meta-chat-platform

# Generate all required secrets
node scripts/generate-secrets.js --format env > secrets.txt

# Review generated secrets
cat secrets.txt
```

### 2. Configure Environment

```bash
# Copy production template
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

**Critical variables to update:**

```env
# Database
DATABASE_URL="postgresql://metachat_user:YOUR_PASSWORD@localhost:5432/metachat_prod"

# Redis
REDIS_URL="redis://:YOUR_REDIS_PASSWORD@localhost:6379/0"

# RabbitMQ
RABBITMQ_URL="amqp://metachat:YOUR_RABBITMQ_PASSWORD@localhost:5672/metachat"

# Encryption (use generated secrets)
ENCRYPTION_KEY="YOUR_GENERATED_ENCRYPTION_KEY"
ADMIN_JWT_SECRET="YOUR_GENERATED_JWT_SECRET"
WEBCHAT_JWT_SECRET="YOUR_GENERATED_WEBCHAT_JWT_SECRET"
WEBCHAT_HMAC_SECRET="YOUR_GENERATED_WEBCHAT_HMAC_SECRET"

# LLM API Keys
OPENAI_API_KEY="sk-proj-YOUR_REAL_OPENAI_KEY"
ANTHROPIC_API_KEY="sk-ant-api03-YOUR_REAL_ANTHROPIC_KEY"

# Domain
API_URL="https://chat.genai.hr"
API_CORS_ORIGINS="https://chat.genai.hr,https://www.chat.genai.hr"
```

### 3. Secure Environment File

```bash
chmod 600 .env.production
```

---

## Database Setup

### 1. Run Migrations

```bash
cd /home/deploy/meta-chat-platform

# Install dependencies
pnpm install

# Run Prisma migrations
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
```

### 2. Verify Database

```bash
# Check tables were created
psql $DATABASE_URL -c "\dt"

# Verify pgvector extension
psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

---

## Application Deployment

### Option A: Automated Deployment (Recommended)

```bash
cd /home/deploy/meta-chat-platform

# Make deploy script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh
```

The script will:
- ✅ Pre-deployment checks
- ✅ Install dependencies
- ✅ Build application
- ✅ Run database migrations
- ✅ Start/reload with PM2
- ✅ Run health checks

### Option B: Manual Deployment

```bash
cd /home/deploy/meta-chat-platform

# Install dependencies
pnpm install --frozen-lockfile

# Build all packages
pnpm build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

### Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check application health
curl http://localhost:3000/health

# Check via HTTPS
curl https://chat.genai.hr/health

# View logs
pm2 logs metachat-api --lines 100
```

---

## Monitoring Setup

### 1. Install Prometheus

```bash
sudo apt install -y prometheus prometheus-node-exporter

# Copy Prometheus configuration
sudo cp infrastructure/monitoring/prometheus.yml /etc/prometheus/prometheus.yml
sudo mkdir -p /etc/prometheus/rules
sudo cp infrastructure/monitoring/prometheus-rules.yml /etc/prometheus/rules/metachat.yml

# Restart Prometheus
sudo systemctl restart prometheus
sudo systemctl enable prometheus
```

### 2. Install Exporters

```bash
# PostgreSQL Exporter
wget https://github.com/prometheus-community/postgres_exporter/releases/download/v0.15.0/postgres_exporter-0.15.0.linux-amd64.tar.gz
tar -xzf postgres_exporter-0.15.0.linux-amd64.tar.gz
sudo mv postgres_exporter-0.15.0.linux-amd64/postgres_exporter /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/postgres-exporter.service > /dev/null <<EOF
[Unit]
Description=PostgreSQL Exporter
After=network.target

[Service]
Type=simple
User=postgres
Environment="DATA_SOURCE_NAME=postgresql://metachat_user:PASSWORD@localhost:5432/metachat_prod?sslmode=disable"
ExecStart=/usr/local/bin/postgres_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable postgres-exporter
sudo systemctl start postgres-exporter

# Redis Exporter
sudo apt install -y prometheus-redis-exporter
```

### 3. Access Monitoring

- **Prometheus**: http://your-server:9090
- **Metrics Endpoint**: https://chat.genai.hr/metrics (restricted to local network)

---

## Backup Configuration

### 1. Configure Automatic Backups

```bash
# Make backup script executable
chmod +x /home/deploy/meta-chat-platform/scripts/backup-database.sh

# Add to crontab (daily at 2 AM)
crontab -e
```

Add:
```cron
0 2 * * * /home/deploy/meta-chat-platform/scripts/backup-database.sh >> /var/log/metachat/backup.log 2>&1
```

### 2. Test Backup

```bash
# Run manual backup
./scripts/backup-database.sh

# Verify backup
ls -lh /var/backups/metachat/

# Test restore (on test database)
gunzip -c /var/backups/metachat/metachat_backup_YYYYMMDD_HHMMSS.sql.gz | \
  psql postgresql://user:password@localhost:5432/test_db
```

### 3. Configure S3 Backups (Optional)

```bash
# Install AWS CLI
sudo apt install -y awscli

# Configure AWS credentials
aws configure

# Update .env.production
DB_BACKUP_S3_BUCKET=your-bucket-name
DB_BACKUP_S3_REGION=us-east-1
```

---

## Log Rotation

### Install Logrotate Configuration

```bash
sudo cp infrastructure/logrotate/metachat /etc/logrotate.d/metachat
sudo chmod 644 /etc/logrotate.d/metachat

# Test configuration
sudo logrotate -d /etc/logrotate.d/metachat

# Force rotation (test)
sudo logrotate -f /etc/logrotate.d/metachat
```

### View Logs

```bash
# Application logs
tail -f /var/log/metachat/app.log | jq .

# PM2 logs
pm2 logs metachat-api

# Nginx logs
tail -f /var/log/nginx/metachat-access.log
tail -f /var/log/nginx/metachat-error.log
```

---

## Maintenance & Operations

### Common Commands

```bash
# Restart application
pm2 restart metachat-api

# Reload with zero downtime
pm2 reload metachat-api

# View logs
pm2 logs metachat-api

# Monitor resources
pm2 monit

# Deploy new version
cd /home/deploy/meta-chat-platform
git pull
./scripts/deploy.sh
```

### Health Checks

```bash
# Application health
curl https://chat.genai.hr/health

# Database health
psql $DATABASE_URL -c "SELECT 1;"

# Redis health
redis-cli -a $REDIS_PASSWORD ping

# RabbitMQ health
sudo rabbitmqctl status
```

### Updates & Patches

```bash
# Pull latest code
cd /home/deploy/meta-chat-platform
git fetch --all
git checkout tags/v1.2.0  # or main branch

# Deploy update
./scripts/deploy.sh

# Rollback if needed
./scripts/deploy.sh --rollback
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs metachat-api --err

# Check environment variables
pm2 env 0

# Check port availability
sudo lsof -i :3000

# Restart with fresh config
pm2 delete metachat-api
pm2 start ecosystem.config.js
```

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check PostgreSQL status
sudo systemctl status postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check Nginx configuration
sudo nginx -t

# View SSL logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### Performance Issues

```bash
# Check resource usage
htop

# Check database queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"

# Check RabbitMQ queues
sudo rabbitmqctl list_queues

# View Prometheus metrics
curl http://localhost:9090/api/v1/query?query=process_resident_memory_bytes
```

### Emergency Procedures

**Application Crash:**
```bash
pm2 restart metachat-api
pm2 logs metachat-api --lines 200
```

**Database Recovery:**
```bash
# Restore from backup
gunzip -c /var/backups/metachat/metachat_backup_LATEST.sql.gz | \
  psql $DATABASE_URL
```

**Full System Recovery:**
```bash
# Stop services
pm2 stop all

# Restore from backup
./scripts/backup-database.sh --verify-only

# Restart services
sudo systemctl restart postgresql redis-server rabbitmq-server nginx
pm2 restart all
```

---

## Security Checklist

- [ ] All secrets rotated from defaults
- [ ] Firewall configured (UFW or iptables)
- [ ] SSH key-based authentication only
- [ ] SSL certificate installed and valid
- [ ] Database accessible only from localhost
- [ ] Redis authentication enabled
- [ ] RabbitMQ default guest user disabled
- [ ] Nginx security headers configured
- [ ] Log rotation configured
- [ ] Automated backups enabled
- [ ] Monitoring and alerting configured
- [ ] fail2ban installed (optional)

---

## Next Steps

1. **Create Admin User**: Use API to create first admin account
2. **Create First Tenant**: Set up a test tenant via API
3. **Configure Channels**: Add WhatsApp/Messenger/WebChat channels
4. **Upload Documents**: Add knowledge base documents for RAG
5. **Test Conversation Flow**: Send test messages through channels
6. **Set Up Monitoring Alerts**: Configure Alertmanager for notifications
7. **Load Testing**: Run performance tests (Milestone 5)
8. **Documentation**: Document tenant-specific setup

---

## Support & Resources

- **Documentation**: `/home/deploy/meta-chat-platform/docs/`
- **API Reference**: `docs/openapi.yaml`
- **Architecture**: `docs/ARCHITECTURE.md`
- **Issues**: GitHub Issues
- **Community**: Discord/Slack (if available)

---

**Deployment Date**: _________________

**Deployed By**: _________________

**Production URL**: https://chat.genai.hr

**Status**: [ ] Staging | [ ] Production
