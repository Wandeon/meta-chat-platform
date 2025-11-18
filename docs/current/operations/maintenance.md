# Maintenance Procedures

**Last Updated:** 2025-11-18
**Status:** ✅ Current
**Maintainer:** Operations Team

## Overview

This document covers routine maintenance procedures for the Meta Chat Platform including database maintenance, backup procedures, log cleanup, dependency updates, and performance optimization. Regular maintenance ensures system reliability, performance, and security.

**Maintenance Schedule:**
- **Daily:** Health checks, log monitoring
- **Weekly:** Log cleanup, backup verification
- **Monthly:** Database maintenance, dependency updates, performance review
- **Quarterly:** Security audit, capacity planning

---

## Daily Maintenance

### Morning Health Check (5 minutes)

Run these checks every morning or at start of business day:

```bash
#!/bin/bash
# Save as: /home/deploy/meta-chat-platform/ops/daily-health-check.sh

echo "=== Daily Health Check - $(date) ==="

# 1. PM2 Process Status
echo -e "\n1. PM2 Process Status:"
sudo -u deploy pm2 list

# 2. Recent Errors (last 24 hours)
echo -e "\n2. Recent Errors:"
error_count=$(grep "\"level\":\"ERROR\"" /home/deploy/meta-chat-platform/logs/api-out.log 2>/dev/null | wc -l)
echo "API Errors: $error_count"

worker_errors=$(grep "\"level\":\"ERROR\"" /home/deploy/meta-chat-platform/logs/worker-out.log 2>/dev/null | wc -l)
echo "Worker Errors: $worker_errors"

# 3. Infrastructure Health
echo -e "\n3. Infrastructure Health:"
health_status=$(curl -s http://localhost:3000/health | grep "healthy" || echo "UNHEALTHY")
echo "API Health: $health_status"

docker ps --filter 'name=meta-chat' --format '{{.Names}}: {{.Status}}'

# 4. Disk Space
echo -e "\n4. Disk Space:"
df -h /home/deploy/meta-chat-platform/logs/ | tail -1

# 5. Process Restarts (should be stable)
echo -e "\n5. Process Restart Counts:"
sudo -u deploy pm2 list | grep -E "restart|meta-chat"

echo -e "\n=== Health Check Complete ==="
```

**Expected Results:**
- ✅ All processes: `online`
- ✅ Error counts: <10 per day
- ✅ Health status: `healthy`
- ✅ Docker containers: `Up X weeks (healthy)`
- ✅ Disk usage: <80%
- ✅ Restart counts: <5 per process

**Actions if Issues Found:**
- Errors: Review logs with `sudo -u deploy pm2 logs --err`
- Unhealthy: Check infrastructure services
- High restarts: Investigate root cause (see troubleshooting.md)

---

## Weekly Maintenance

### Log Cleanup and Rotation Verification (10 minutes)

**Every Monday morning:**

```bash
#!/bin/bash
# Save as: /home/deploy/meta-chat-platform/ops/weekly-log-maintenance.sh

echo "=== Weekly Log Maintenance - $(date) ==="

# 1. Check log directory size
echo -e "\n1. Log Directory Size:"
du -sh /home/deploy/meta-chat-platform/logs/

# 2. List large log files (>100MB)
echo -e "\n2. Large Log Files (>100MB):"
find /home/deploy/meta-chat-platform/logs/ -name "*.log" -size +100M -exec ls -lh {} \;

# 3. Verify log rotation is working
echo -e "\n3. Log Rotation Status:"
sudo -u deploy pm2 list | grep logrotate

# 4. Check rotated log count (should have ~7 days worth)
echo -e "\n4. Rotated Log Count:"
ls -l /home/deploy/meta-chat-platform/logs/*__*.log 2>/dev/null | wc -l

# 5. Remove logs older than 7 days (if not handled by rotation)
echo -e "\n5. Cleaning Old Logs (>7 days):"
find /home/deploy/meta-chat-platform/logs/ -name "*__*.log" -mtime +7 -type f -delete
echo "Cleanup complete"

# 6. Flush PM2 log buffer
echo -e "\n6. Flushing PM2 Logs:"
sudo -u deploy pm2 flush

echo -e "\n=== Log Maintenance Complete ==="
```

**Manual Rotation (if needed):**

```bash
# Force log rotation
sudo -u deploy pm2 reloadLogs

# Manually rotate specific logs
cd /home/deploy/meta-chat-platform/logs/
timestamp=$(date +%Y-%m-%d_%H-%M-%S)
sudo -u deploy mv api-out.log api-out__${timestamp}.log
sudo -u deploy touch api-out.log
sudo -u deploy pm2 restart meta-chat-api
```

---

### Backup Verification (5 minutes)

**Every Monday morning:**

```bash
#!/bin/bash
# Save as: /home/deploy/meta-chat-platform/ops/verify-backups.sh

echo "=== Backup Verification - $(date) ==="

# 1. Check last backup timestamp
echo -e "\n1. Last Backup:"
# If backups go to /var/backups/metachat/
last_backup=$(ls -lt /var/backups/metachat/ 2>/dev/null | head -2 | tail -1)
echo "$last_backup"

# 2. Verify backup size (should be >10MB for active database)
backup_dir="/var/backups/metachat"
if [ -d "$backup_dir" ]; then
  latest_backup=$(ls -t $backup_dir/*.sql.gz 2>/dev/null | head -1)
  if [ -f "$latest_backup" ]; then
    size=$(du -h "$latest_backup" | cut -f1)
    echo "Backup size: $size"
  else
    echo "WARNING: No backup files found!"
  fi
else
  echo "WARNING: Backup directory not found!"
fi

# 3. Test database connection
echo -e "\n2. Database Connection Test:"
docker exec meta-chat-postgres pg_isready -U metachat

# 4. Check database size
echo -e "\n3. Database Size:"
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT pg_size_pretty(pg_database_size('metachat')) as size;"

echo -e "\n=== Backup Verification Complete ==="
```

---

## Monthly Maintenance

### Database Maintenance (30 minutes)

**First Sunday of every month (during low-traffic hours):**

#### 1. Vector Index Maintenance

The pgvector IVFFlat index needs periodic rebuilding for optimal performance:

```bash
#!/bin/bash
# Save as: /home/deploy/meta-chat-platform/ops/monthly-db-maintenance.sh

echo "=== Monthly Database Maintenance - $(date) ==="

# 1. Rebuild vector index (CONCURRENTLY to avoid locking)
echo -e "\n1. Rebuilding Vector Index:"
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "REINDEX INDEX CONCURRENTLY chunks_embedding_ivfflat_idx;" || echo "Index rebuild failed"

# 2. Vacuum and analyze chunks table
echo -e "\n2. Vacuuming Chunks Table:"
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "VACUUM (ANALYZE, VERBOSE) chunks;"

# 3. Vacuum and analyze all tables
echo -e "\n3. Vacuuming All Tables:"
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "VACUUM (ANALYZE) tenants, channels, conversations, messages, events, chunks;"

# 4. Check for bloat
echo -e "\n4. Table Bloat Check:"
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT schemaname, tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
   LIMIT 10;"

# 5. Check index health
echo -e "\n5. Index Health:"
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT schemaname, tablename, indexname,
          pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
   FROM pg_indexes
   WHERE schemaname = 'public'
   ORDER BY pg_relation_size(indexname::regclass) DESC
   LIMIT 10;"

# 6. Update table statistics
echo -e "\n6. Updating Statistics:"
docker exec meta-chat-postgres psql -U metachat -d metachat -c "ANALYZE;"

echo -e "\n=== Database Maintenance Complete ==="
```

**Schedule with cron (as deploy user):**

```bash
# Edit crontab
crontab -e

# Add maintenance schedule (3 AM first Sunday of month)
0 3 1-7 * 0 [ "$(date +\%u)" = 7 ] && /home/deploy/meta-chat-platform/ops/monthly-db-maintenance.sh >> /var/log/metachat/maintenance.log 2>&1
```

#### 2. Database Statistics Review

```bash
# Connection pool usage
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Slow queries
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT query, calls, mean_exec_time, max_exec_time
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;"

# Table sizes
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT schemaname, tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
          n_tup_ins as inserts, n_tup_upd as updates, n_tup_del as deletes
   FROM pg_stat_user_tables
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

---

### Database Backup

#### Automated Backup Script

```bash
#!/bin/bash
# Save as: /home/deploy/meta-chat-platform/ops/backup-database.sh

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/metachat"
RETENTION_DAYS=30
DB_CONTAINER="meta-chat-postgres"
DB_NAME="metachat"
DB_USER="metachat"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/metachat_backup_$DATE.sql"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "=== Database Backup Started - $(date) ==="

# Perform backup
echo "Backing up database $DB_NAME..."
docker exec $DB_CONTAINER pg_dump -U $DB_USER -Fc $DB_NAME > "$BACKUP_FILE"

# Compress backup
echo "Compressing backup..."
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
  size=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "Backup created: $BACKUP_FILE ($size)"
else
  echo "ERROR: Backup file not created!"
  exit 1
fi

# Remove old backups
echo "Removing backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "metachat_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
remaining=$(ls -1 "$BACKUP_DIR"/metachat_backup_*.sql.gz 2>/dev/null | wc -l)
echo "Remaining backups: $remaining"

echo "=== Database Backup Complete - $(date) ==="
```

**Schedule Daily Backups:**

```bash
# Edit crontab as deploy user
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/deploy/meta-chat-platform/ops/backup-database.sh >> /var/log/metachat/backup.log 2>&1
```

#### Manual Backup

```bash
# Full database backup
docker exec meta-chat-postgres pg_dump -U metachat -Fc metachat > \
  /tmp/metachat_manual_$(date +%Y%m%d_%H%M%S).sql

# Compress
gzip /tmp/metachat_manual_*.sql

# Download backup (from local machine)
scp admin@100.97.156.41:/tmp/metachat_manual_*.sql.gz ./
```

#### Restore from Backup

```bash
# Stop applications
sudo -u deploy pm2 stop all

# Drop and recreate database
docker exec meta-chat-postgres psql -U metachat -d postgres -c "DROP DATABASE IF EXISTS metachat;"
docker exec meta-chat-postgres psql -U metachat -d postgres -c "CREATE DATABASE metachat;"

# Restore backup
gunzip -c /var/backups/metachat/metachat_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i meta-chat-postgres pg_restore -U metachat -d metachat

# Restart applications
sudo -u deploy pm2 restart all

# Verify health
curl http://localhost:3000/health
```

---

### Dependency Updates (30 minutes)

**First Monday of every month:**

```bash
#!/bin/bash
# Save as: /home/deploy/meta-chat-platform/ops/update-dependencies.sh

echo "=== Dependency Update - $(date) ==="

cd /home/deploy/meta-chat-platform

# 1. Check for outdated packages
echo -e "\n1. Checking for outdated packages:"
sudo -u deploy npm outdated

# 2. Update non-breaking dependencies
echo -e "\n2. Updating patch and minor versions:"
sudo -u deploy npm update

# 3. Check for security vulnerabilities
echo -e "\n3. Security Audit:"
sudo -u deploy npm audit

# 4. Fix security issues (if safe)
echo -e "\n4. Fixing Security Issues:"
sudo -u deploy npm audit fix

# 5. Rebuild packages
echo -e "\n5. Rebuilding:"
sudo -u deploy npm run build

# 6. Restart with new dependencies
echo -e "\n6. Restarting processes:"
sudo -u deploy pm2 restart all

# 7. Monitor for issues
echo -e "\n7. Monitoring startup:"
sleep 10
sudo -u deploy pm2 list

# 8. Check health
echo -e "\n8. Health Check:"
curl -s http://localhost:3000/health

echo -e "\n=== Dependency Update Complete ==="
```

**Review Major Updates Manually:**

```bash
# List major updates available
npm outdated --long

# Update specific package to latest major version
npm install <package>@latest

# Test thoroughly before deploying
npm run build
npm test
```

---

### Performance Review (20 minutes)

**Monthly performance metrics review:**

```bash
#!/bin/bash
# Save as: /home/deploy/meta-chat-platform/ops/monthly-performance-review.sh

echo "=== Monthly Performance Review - $(date) ==="

# 1. Process uptime and restart counts
echo -e "\n1. Process Stability (last 30 days):"
sudo -u deploy pm2 list

# 2. Average response times
echo -e "\n2. API Response Times (last 7 days):"
grep "durationMs" /home/deploy/meta-chat-platform/logs/api-out__*.log 2>/dev/null | \
  awk -F'"durationMs":' '{print $2}' | \
  awk -F',' '{sum+=$1; count++} END {print "Average: " sum/count "ms"}'

# 3. Error rates
echo -e "\n3. Error Rates (last 7 days):"
total_requests=$(grep '"statusCode"' /home/deploy/meta-chat-platform/logs/api-out__*.log 2>/dev/null | wc -l)
error_requests=$(grep '"statusCode":5' /home/deploy/meta-chat-platform/logs/api-out__*.log 2>/dev/null | wc -l)
echo "Total requests: $total_requests"
echo "5xx errors: $error_requests"
if [ $total_requests -gt 0 ]; then
  error_rate=$(awk "BEGIN {print ($error_requests / $total_requests) * 100}")
  echo "Error rate: $error_rate%"
fi

# 4. Database performance
echo -e "\n4. Database Performance:"
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT query, calls, mean_exec_time, max_exec_time
   FROM pg_stat_statements
   WHERE mean_exec_time > 100
   ORDER BY mean_exec_time DESC
   LIMIT 5;"

# 5. Disk usage trend
echo -e "\n5. Disk Usage:"
df -h /home/deploy/meta-chat-platform/logs/
df -h /var/lib/docker/

# 6. Memory usage trend
echo -e "\n6. Memory Usage:"
sudo -u deploy pm2 list
free -h

echo -e "\n=== Performance Review Complete ==="
```

---

## Quarterly Maintenance

### Security Audit (2 hours)

**Every quarter (January, April, July, October):**

```bash
#!/bin/bash
# Save as: /home/deploy/meta-chat-platform/ops/quarterly-security-audit.sh

echo "=== Quarterly Security Audit - $(date) ==="

cd /home/deploy/meta-chat-platform

# 1. Run npm audit
echo -e "\n1. NPM Security Audit:"
sudo -u deploy npm audit --production

# 2. Check for deprecated packages
echo -e "\n2. Deprecated Packages:"
sudo -u deploy npm ls --depth=0 | grep deprecated

# 3. Review Docker image versions
echo -e "\n3. Docker Image Versions:"
docker images | grep meta-chat

# 4. Check SSL certificate expiry
echo -e "\n4. SSL Certificate Status:"
echo | openssl s_client -servername chat.genai.hr -connect chat.genai.hr:443 2>/dev/null | \
  openssl x509 -noout -dates

# 5. Review user access
echo -e "\n5. System User Review:"
grep deploy /etc/passwd

# 6. Check firewall rules
echo -e "\n6. Firewall Status:"
sudo ufw status

# 7. Review API keys rotation
echo -e "\n7. Admin Keys Age:"
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT name, \"createdAt\", \"lastUsedAt\"
   FROM admin_keys
   ORDER BY \"createdAt\" DESC;"

# 8. Check for exposed secrets
echo -e "\n8. Secret Exposure Check:"
grep -r "password\|secret\|key" .env* 2>/dev/null | grep -v ".example" || echo "No .env files found (good)"

echo -e "\n=== Security Audit Complete ==="
echo "Review findings and create remediation plan"
```

**Action Items:**
- Fix high/critical npm vulnerabilities
- Rotate admin API keys older than 90 days
- Renew SSL certificates if expiring in <30 days
- Update Docker base images
- Review and update firewall rules

---

### Capacity Planning (1 hour)

**Every quarter:**

```bash
#!/bin/bash
# Save as: /home/deploy/meta-chat-platform/ops/capacity-planning.sh

echo "=== Capacity Planning Review - $(date) ==="

# 1. Database growth rate
echo -e "\n1. Database Growth:"
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT
     pg_size_pretty(pg_database_size('metachat')) as current_size,
     (SELECT count(*) FROM tenants) as tenant_count,
     (SELECT count(*) FROM conversations) as conversation_count,
     (SELECT count(*) FROM messages) as message_count,
     (SELECT count(*) FROM chunks) as document_chunks;"

# 2. Storage usage trends
echo -e "\n2. Storage Usage:"
df -h /var/lib/docker/volumes/
du -sh /home/deploy/meta-chat-platform/storage/
du -sh /home/deploy/meta-chat-platform/logs/

# 3. Traffic trends
echo -e "\n3. Request Volume (last 30 days):"
for i in {0..29}; do
  date=$(date -d "$i days ago" +%Y-%m-%d)
  count=$(grep "$date" /home/deploy/meta-chat-platform/logs/api-out.log 2>/dev/null | \
          grep '"statusCode"' | wc -l)
  echo "$date: $count requests"
done | tail -7  # Show last 7 days

# 4. Resource usage peaks
echo -e "\n4. Peak Resource Usage:"
echo "Check Prometheus/Grafana dashboards for:"
echo "  - Peak CPU usage"
echo "  - Peak memory usage"
echo "  - Peak concurrent connections"
echo "  - Peak queue depths"

# 5. Projections
echo -e "\n5. Growth Projections:"
echo "Based on current growth rate, estimate:"
echo "  - Database size in 3 months"
echo "  - Storage requirements in 6 months"
echo "  - When to scale horizontally"

echo -e "\n=== Capacity Planning Complete ==="
echo "Review metrics and plan infrastructure scaling"
```

**Scaling Triggers:**
- Database size >100GB: Consider dedicated database server
- Request volume >1000/min: Add API instances behind load balancer
- Queue depth consistently >5000: Add worker instances
- Disk usage >80%: Increase volume size or add retention policies

---

## Optimization Procedures

### Database Query Optimization

```bash
# Find slow queries
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT query, calls, mean_exec_time, max_exec_time, stddev_exec_time
   FROM pg_stat_statements
   WHERE mean_exec_time > 100
   ORDER BY mean_exec_time DESC
   LIMIT 10;"

# Check missing indexes
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT schemaname, tablename, attname, n_distinct, correlation
   FROM pg_stats
   WHERE schemaname = 'public' AND n_distinct > 100
   ORDER BY abs(correlation) DESC;"

# Analyze query plan
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "EXPLAIN ANALYZE <your-slow-query>;"
```

### Memory Optimization

```bash
# Check Node.js heap usage
curl http://localhost:3000/metrics | grep heap

# Monitor memory leaks
sudo -u deploy pm2 monit

# Adjust heap size if needed (in ecosystem.config.js)
# node_args: '--max-old-space-size=2048'
```

### Log Optimization

```bash
# Reduce log verbosity in production
# Edit ecosystem.config.js:
# LOG_LEVEL: 'info'  # or 'warn' for less verbosity

# Configure more aggressive log rotation
# Edit pm2-logrotate config:
sudo -u deploy pm2 set pm2-logrotate:retain 3  # Keep only 3 days
sudo -u deploy pm2 set pm2-logrotate:max_size 100M  # Rotate at 100MB
```

---

## Emergency Maintenance

### Disk Space Emergency

```bash
# Find and delete old logs immediately
cd /home/deploy/meta-chat-platform/logs/
sudo -u deploy find . -name "*__*.log" -mtime +3 -delete

# Compress current logs
sudo -u deploy gzip *.log

# Flush PM2 logs
sudo -u deploy pm2 flush

# Check space
df -h /
```

### Database Emergency Optimization

```bash
# Quick vacuum (non-blocking)
docker exec meta-chat-postgres psql -U metachat -d metachat -c "VACUUM;"

# Terminate long-running queries
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'active' AND query_start < NOW() - INTERVAL '10 minutes'
   AND query NOT LIKE '%pg_stat_activity%';"

# Kill idle connections
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle' AND state_change < NOW() - INTERVAL '30 minutes';"
```

---

## Maintenance Checklists

### Pre-Deployment Checklist

- [ ] Run full test suite
- [ ] Backup database
- [ ] Check disk space >20% free
- [ ] Review changelog and breaking changes
- [ ] Plan rollback procedure
- [ ] Schedule during low-traffic window
- [ ] Notify stakeholders

### Post-Deployment Checklist

- [ ] Verify PM2 processes online
- [ ] Check health endpoint responds
- [ ] Review error logs for new issues
- [ ] Monitor response times
- [ ] Verify key features work
- [ ] Check escalation system functioning
- [ ] Update deployment log

---

## Maintenance Scripts Location

All maintenance scripts are located in:

```
/home/deploy/meta-chat-platform/ops/
├── daily-health-check.sh
├── weekly-log-maintenance.sh
├── verify-backups.sh
├── monthly-db-maintenance.sh
├── backup-database.sh
├── update-dependencies.sh
├── monthly-performance-review.sh
├── quarterly-security-audit.sh
└── capacity-planning.sh
```

Make all scripts executable:

```bash
chmod +x /home/deploy/meta-chat-platform/ops/*.sh
```

---

## Related Documentation

- [Monitoring Guide](./monitoring.md) - Monitoring setup and dashboards
- [Troubleshooting Guide](./troubleshooting.md) - Common issues and solutions
- [Vector Maintenance](/home/deploy/meta-chat-platform/docs/vector-maintenance.md) - pgvector specific maintenance
- [Deployment Guide](/home/deploy/meta-chat-platform/docs/DEPLOYMENT.md) - Deployment procedures

---

**Document Version:** 1.0
**Next Review:** 2025-12-18
**Questions/Updates:** Contact Operations Team
