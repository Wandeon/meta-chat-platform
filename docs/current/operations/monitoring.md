# Monitoring & Observability

**Last Updated:** 2025-11-18
**Status:** ✅ Current
**Maintainer:** Operations Team

## Overview

The Meta Chat Platform uses a multi-layered monitoring approach combining PM2 process management, Prometheus metrics collection, structured logging with Pino, and automated log rotation. This document covers monitoring tools, log locations, key metrics, and daily operational procedures.

**Monitoring Philosophy:**
- Real-time process health with PM2
- Prometheus metrics for performance tracking
- Structured JSON logs for debugging and audit trails
- Automated log rotation to prevent disk exhaustion
- Health checks for all infrastructure services

---

## PM2 Process Monitoring

### Quick Status Check

```bash
# View all processes
sudo -u deploy pm2 list

# Detailed process information
sudo -u deploy pm2 describe meta-chat-api
sudo -u deploy pm2 describe meta-chat-worker

# Real-time monitoring dashboard
sudo -u deploy pm2 monit
```

### Process Status Details

The platform runs **2 main processes**:

| Process ID | Name | Purpose | Port | Memory Limit |
|-----------|------|---------|------|--------------|
| 0 | meta-chat-api | REST API & WebSocket server | 3000 | 500MB |
| 1 | meta-chat-worker | Async message processing (WhatsApp, Messenger) | N/A | 500MB |

**Expected Process Metrics:**
- **Status:** `online` (should always be online)
- **Uptime:** >1 hour (frequent restarts indicate issues)
- **Restarts:** <10 per day (check logs if higher)
- **CPU:** <20% average
- **Memory:** <400MB (restarts at 500MB)

### PM2 Commands Reference

```bash
# Process Management
sudo -u deploy pm2 list                    # List all processes
sudo -u deploy pm2 describe <process>      # Detailed process info
sudo -u deploy pm2 monit                   # Real-time monitoring UI
sudo -u deploy pm2 info meta-chat-api      # Process details

# Restart/Reload
sudo -u deploy pm2 restart meta-chat-api   # Restart single process
sudo -u deploy pm2 restart all             # Restart all processes
sudo -u deploy pm2 reload all              # Zero-downtime reload

# Logs
sudo -u deploy pm2 logs                    # Tail all logs
sudo -u deploy pm2 logs meta-chat-api      # Tail specific process
sudo -u deploy pm2 logs --lines 100        # Show last 100 lines
sudo -u deploy pm2 logs --err              # Only error logs
sudo -u deploy pm2 flush                   # Clear PM2 log buffer

# Process Control
sudo -u deploy pm2 stop meta-chat-worker   # Stop process
sudo -u deploy pm2 start meta-chat-worker  # Start process
sudo -u deploy pm2 delete <process>        # Remove from PM2

# Save Process List
sudo -u deploy pm2 save                    # Save current process list
sudo -u deploy pm2 resurrect               # Restore saved processes
```

### PM2 Configuration

Process configuration is defined in `/home/deploy/meta-chat-platform/ecosystem.config.js`:

**Key Settings:**
- **autorestart:** `true` - Automatic restart on failure
- **max_restarts:** `10` - Backoff after 10 restarts
- **min_uptime:** `10s` - Must stay up 10s to count as successful start
- **max_memory_restart:** `500M` - Restart if memory exceeds 500MB
- **kill_timeout:** `5000` - 5 second graceful shutdown timeout

---

## Log Locations and Structure

### Application Logs (PM2)

All application logs are stored in `/home/deploy/meta-chat-platform/logs/`:

```bash
# Current logs (active)
/home/deploy/meta-chat-platform/logs/api-out.log         # API stdout (JSON structured)
/home/deploy/meta-chat-platform/logs/api-error.log       # API stderr (errors, stack traces)
/home/deploy/meta-chat-platform/logs/worker-out.log      # Worker stdout
/home/deploy/meta-chat-platform/logs/worker-error.log    # Worker stderr

# Rotated logs (archived hourly by pm2-logrotate)
/home/deploy/meta-chat-platform/logs/api-out__2025-11-18_19-23-00.log
/home/deploy/meta-chat-platform/logs/worker-out__2025-11-18_19-23-00.log
```

**Log Rotation:**
- PM2 logs are rotated **hourly** by the `pm2-logrotate` module
- Rotated logs are kept for **7 days** by default
- Large worker logs (~1GB per hour) are automatically compressed
- Old logs are deleted after retention period

### PM2 Internal Logs

```bash
/home/deploy/.pm2/pm2.log                  # PM2 daemon log
/home/deploy/.pm2/logs/pm2-logrotate-*.log # Log rotation logs
```

### System Logs (if configured)

```bash
# Nginx logs
/var/log/nginx/metachat-access.log         # HTTP access logs
/var/log/nginx/metachat-error.log          # Nginx errors

# Application logs (if logrotate is configured)
/var/log/metachat/app.log                  # Aggregated application logs
/var/log/metachat/backup.log               # Database backup logs
/var/log/metachat/cron.log                 # Scheduled task logs
```

### Log Format

Application logs use **Pino structured JSON logging**:

```json
{
  "level": "INFO",
  "time": "2025-11-18T18:24:47.693Z",
  "pid": 1732,
  "hostname": "v2202504269591335677",
  "scope": "ApiServer.Http",
  "requestId": "69c8a826-d806-454c-a2f6-60033a959b09",
  "correlationId": "69c8a826-d806-454c-a2f6-60033a959b09",
  "method": "GET",
  "route": "/health",
  "statusCode": 200,
  "durationMs": 52.47251,
  "message": "HTTP request completed"
}
```

**Log Levels:**
- `FATAL` - Critical errors requiring immediate attention
- `ERROR` - Errors that need investigation
- `WARN` - Warnings about potential issues
- `INFO` - Normal operational messages
- `DEBUG` - Detailed debugging information
- `TRACE` - Very verbose diagnostic information

---

## Analyzing Logs

### Tail Live Logs

```bash
# All processes
sudo -u deploy pm2 logs

# Specific process
sudo -u deploy pm2 logs meta-chat-api --lines 50

# Only errors
sudo -u deploy pm2 logs --err

# Follow without PM2
tail -f /home/deploy/meta-chat-platform/logs/api-out.log
tail -f /home/deploy/meta-chat-platform/logs/worker-error.log
```

### Search Logs for Errors

```bash
# Find errors in current logs
grep -i error /home/deploy/meta-chat-platform/logs/api-error.log

# Search all rotated logs for specific error
grep -r "ECONNREFUSED" /home/deploy/meta-chat-platform/logs/

# Count errors by type
grep "\"level\":\"ERROR\"" /home/deploy/meta-chat-platform/logs/api-out.log | wc -l

# Find slow requests (>1000ms)
grep "durationMs" /home/deploy/meta-chat-platform/logs/api-out.log | \
  awk -F'"durationMs":' '{print $2}' | \
  awk -F',' '{if ($1 > 1000) print $1}' | \
  sort -nr | head -10
```

### Parse JSON Logs

```bash
# Pretty print JSON logs (requires jq)
tail -f /home/deploy/meta-chat-platform/logs/api-out.log | \
  while read line; do echo "$line" | jq .; done

# Extract specific fields
cat /home/deploy/meta-chat-platform/logs/api-out.log | \
  jq -r 'select(.level=="ERROR") | "\(.time) \(.scope) \(.message)"'

# Count requests by route
cat /home/deploy/meta-chat-platform/logs/api-out.log | \
  jq -r 'select(.route) | .route' | sort | uniq -c | sort -rn
```

---

## Health Checks

### API Health Endpoint

```bash
# Quick health check
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "services": {
    "database": "up",
    "redis": "up",
    "rabbitmq": "up"
  },
  "timestamp": "2025-11-18T18:24:47.692Z"
}

# Check from external monitoring
curl https://chat.genai.hr/health
```

### Infrastructure Services

```bash
# Check Docker containers
docker ps --filter 'name=meta-chat' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

# Expected output:
# meta-chat-postgres    Up 5 weeks (healthy)    127.0.0.1:5432->5432/tcp
# meta-chat-rabbitmq    Up 5 weeks (healthy)    5672/tcp, 15672/tcp
# meta-chat-redis       Up 5 weeks (healthy)    6379/tcp

# Test database connection
docker exec meta-chat-postgres pg_isready -U metachat

# Test Redis connection
docker exec meta-chat-redis redis-cli ping

# Test RabbitMQ connection
docker exec meta-chat-rabbitmq rabbitmq-diagnostics ping
```

---

## Metrics Collection

### Prometheus Metrics Endpoint

```bash
# View metrics
curl http://localhost:3000/metrics

# Key metrics available:
- process_cpu_user_seconds_total          # CPU usage
- process_cpu_system_seconds_total        # System CPU time
- process_resident_memory_bytes           # Memory usage
- process_heap_bytes                      # Heap size
- http_request_duration_seconds           # Request latency
- http_requests_total                     # Request count
```

### Prometheus Configuration

Prometheus scrapes metrics every 15 seconds from:
- **API:** `http://localhost:3000/metrics`
- **Node Exporter:** `http://localhost:9100` (system metrics)
- **PostgreSQL:** `http://localhost:9187` (database metrics)
- **Redis:** `http://localhost:9121` (cache metrics)
- **RabbitMQ:** `http://localhost:15692/metrics` (queue metrics)

Configuration: `/home/deploy/meta-chat-platform/infrastructure/monitoring/prometheus.yml`

---

## Metrics to Watch

### Critical Metrics

**Process Health:**
- ✅ PM2 process status = `online`
- ✅ Process uptime > 1 hour
- ✅ Restart count < 10/day
- ✅ Memory usage < 400MB

**API Performance:**
- ✅ HTTP 200 response rate > 99%
- ✅ Average response time < 200ms
- ✅ P95 response time < 500ms
- ✅ P99 response time < 1000ms

**Infrastructure:**
- ✅ Database connections < 80% of max
- ✅ Redis memory usage < 80%
- ✅ RabbitMQ queue depth < 1000 messages
- ✅ Disk usage < 80%

**Errors:**
- ⚠️ Error rate < 1%
- ⚠️ No FATAL level logs
- ⚠️ No repeated ERROR patterns

### Performance Baselines

```bash
# API request rate
# Baseline: 10-100 requests/minute during business hours

# Worker processing rate
# Baseline: 5-50 messages/minute (varies by tenant activity)

# Database query time
# Baseline: <50ms for simple queries, <500ms for RAG searches

# RabbitMQ message age
# Baseline: <5 seconds from publish to consume
```

---

## Alert Thresholds

### Critical Alerts (immediate response)

- ❌ PM2 process status = `stopped` or `errored`
- ❌ Process restart loop (>3 restarts in 5 minutes)
- ❌ Health check fails for >2 minutes
- ❌ Database connection pool exhausted
- ❌ RabbitMQ queue depth >5000 messages
- ❌ Disk usage >90%
- ❌ Memory leak (steady growth >100MB/hour)

### Warning Alerts (investigate soon)

- ⚠️ Process restarts >5 in 1 hour
- ⚠️ HTTP 5xx error rate >5%
- ⚠️ P95 response time >1000ms
- ⚠️ Database connections >60% of max
- ⚠️ RabbitMQ queue depth >1000 messages
- ⚠️ Disk usage >80%
- ⚠️ Log rotation failures

---

## Daily Monitoring Tasks

### Morning Health Check (5 minutes)

```bash
# 1. Check PM2 status
sudo -u deploy pm2 list

# 2. Check for errors in last 24 hours
grep "\"level\":\"ERROR\"" /home/deploy/meta-chat-platform/logs/api-out.log | tail -20
grep "\"level\":\"ERROR\"" /home/deploy/meta-chat-platform/logs/worker-out.log | tail -20

# 3. Verify infrastructure health
curl -s http://localhost:3000/health | grep "healthy"
docker ps --filter 'name=meta-chat' --format '{{.Names}}: {{.Status}}'

# 4. Check disk space
df -h /home/deploy/meta-chat-platform/logs/

# 5. Check restart counts
sudo -u deploy pm2 list | grep -E "restart|meta-chat"
```

### Weekly Review (15 minutes)

```bash
# 1. Review process restart patterns
sudo -u deploy pm2 describe meta-chat-api | grep "restart"
sudo -u deploy pm2 describe meta-chat-worker | grep "restart"

# 2. Analyze error trends
# Count errors by day for last 7 days
for i in {0..6}; do
  date=$(date -d "$i days ago" +%Y-%m-%d)
  count=$(grep "$date" /home/deploy/meta-chat-platform/logs/api-error.log 2>/dev/null | wc -l)
  echo "$date: $count errors"
done

# 3. Check log rotation health
ls -lh /home/deploy/meta-chat-platform/logs/ | tail -20

# 4. Verify backup completion (if configured)
tail -20 /var/log/metachat/backup.log 2>/dev/null || echo "No backup logs"

# 5. Review Prometheus metrics trends (if configured)
# Access Prometheus UI: http://localhost:9090
```

---

## Operations Dashboard

### PM2 Real-Time Monitor

```bash
# Launch interactive monitoring dashboard
sudo -u deploy pm2 monit

# Displays:
# - CPU usage per process
# - Memory usage per process
# - Real-time log stream
# - Process list with status

# Keyboard shortcuts:
# q - quit
# Up/Down - navigate processes
# Enter - view process details
```

### Web-Based Dashboards

**PM2 Plus (optional):**
- Cloud-based PM2 monitoring
- Process metrics history
- Log aggregation
- Alert notifications

**Prometheus + Grafana (optional):**
- Custom metric dashboards
- Long-term metric storage
- Advanced alerting rules
- Visualization of trends

---

## Code References

### Configuration Files

```
/home/deploy/meta-chat-platform/ecosystem.config.js
  - PM2 process definitions
  - Environment variables
  - Log file locations
  - Restart policies

/home/deploy/meta-chat-platform/infrastructure/monitoring/prometheus.yml
  - Prometheus scrape configuration
  - Alerting rules
  - Target endpoints

/home/deploy/meta-chat-platform/infrastructure/logrotate/metachat
  - Log rotation policies
  - Retention periods
  - Compression settings
```

### Log Configuration

```typescript
// packages/shared/src/utils/logger.ts
// Pino logger configuration with structured logging

// apps/api/src/server.ts
// HTTP request logging middleware

// apps/worker/src/index.ts
// Worker process logging setup
```

---

## Related Documentation

- [Troubleshooting Guide](./troubleshooting.md) - Common issues and solutions
- [Maintenance Procedures](./maintenance.md) - Routine maintenance tasks
- [Deployment Guide](/home/deploy/meta-chat-platform/docs/DEPLOYMENT.md) - Deployment procedures
- [Architecture Overview](/home/deploy/meta-chat-platform/docs/ARCHITECTURE.md) - System architecture

---

## External Monitoring (Recommended)

For production systems, implement external monitoring:

**Uptime Monitoring:**
- UptimeRobot
- Pingdom
- StatusCake

**APM (Application Performance Monitoring):**
- New Relic
- Datadog
- Sentry

**Log Aggregation:**
- Logtail
- Papertrail
- Loggly

---

## Quick Reference Card

```bash
# Check if everything is running
sudo -u deploy pm2 list && curl -s localhost:3000/health

# View recent errors
sudo -u deploy pm2 logs --err --lines 20

# Restart unhealthy process
sudo -u deploy pm2 restart meta-chat-api

# Check disk space
df -h /home/deploy/meta-chat-platform/logs/

# Find slow requests in last hour
find /home/deploy/meta-chat-platform/logs/ -name "api-out*.log" -mmin -60 -exec \
  grep "durationMs" {} \; | awk -F'"durationMs":' '{print $2}' | \
  awk -F',' '{if ($1 > 1000) print $1}' | sort -rn | head -10
```

---

**Document Version:** 1.0
**Next Review:** 2025-12-18
**Questions/Updates:** Contact Operations Team
