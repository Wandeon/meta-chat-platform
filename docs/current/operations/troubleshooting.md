# Troubleshooting Guide

**Last Updated:** 2025-11-18
**Status:** ✅ Current
**Maintainer:** Operations Team

## Overview

This guide covers common issues, diagnostic procedures, and solutions for the Meta Chat Platform. Issues are organized by severity and component, with step-by-step resolution procedures.

**Troubleshooting Philosophy:**
- Check logs first (PM2 logs provide most diagnostic info)
- Verify infrastructure health (database, Redis, RabbitMQ)
- Restart processes as last resort (investigate root cause first)
- Document new issues and solutions

---

## Quick Diagnostic Checklist

When something goes wrong, run these commands first:

```bash
# 1. Check PM2 process status
sudo -u deploy pm2 list

# 2. Check recent errors
sudo -u deploy pm2 logs --err --lines 50

# 3. Verify infrastructure health
curl -s http://localhost:3000/health
docker ps --filter 'name=meta-chat'

# 4. Check disk space
df -h /home/deploy/meta-chat-platform/logs/

# 5. Review recent restarts
sudo -u deploy pm2 describe meta-chat-api | grep -i restart
```

---

## Process Issues

### Issue: Process Shows as "Stopped" or "Errored"

**Symptoms:**
- `pm2 list` shows status as `stopped` or `errored`
- Application is not responding
- Health check fails

**Diagnosis:**

```bash
# Check PM2 status
sudo -u deploy pm2 list

# View error logs
sudo -u deploy pm2 logs meta-chat-api --err --lines 100

# Check process description
sudo -u deploy pm2 describe meta-chat-api
```

**Common Causes:**

1. **Build artifacts missing or corrupted**
   ```bash
   # Check if dist directory exists
   ls -la /home/deploy/meta-chat-platform/apps/api/dist/
   ls -la /home/deploy/meta-chat-platform/apps/worker/dist/

   # Rebuild if missing
   cd /home/deploy/meta-chat-platform
   sudo -u deploy npm run build
   ```

2. **Port already in use (API only)**
   ```bash
   # Check what's using port 3000
   sudo netstat -tlnp | grep 3000
   sudo lsof -i :3000

   # Kill conflicting process
   sudo kill -9 <PID>
   ```

3. **Environment variables missing**
   ```bash
   # Check ecosystem.config.js has required variables
   cat /home/deploy/meta-chat-platform/ecosystem.config.js | grep -A 20 "env:"

   # Verify .env.production exists
   ls -la /home/deploy/meta-chat-platform/apps/api/.env.production
   ```

**Resolution:**

```bash
# Start the process
sudo -u deploy pm2 start meta-chat-api

# If it crashes immediately, check logs
sudo -u deploy pm2 logs meta-chat-api --err --lines 50

# Restart with clean state
sudo -u deploy pm2 delete meta-chat-api
sudo -u deploy pm2 start ecosystem.config.js --only meta-chat-api
```

---

### Issue: Process Restart Loop

**Symptoms:**
- Process restarts multiple times per minute
- `pm2 list` shows high restart count
- Logs show repeated startup and crash

**Diagnosis:**

```bash
# Check restart count and uptime
sudo -u deploy pm2 list

# View crash logs
sudo -u deploy pm2 logs --err --lines 100

# Check memory usage before restart
sudo -u deploy pm2 describe meta-chat-api | grep -i memory
```

**Common Causes:**

1. **Uncaught exception in code**
   ```bash
   # Look for stack traces
   grep -A 10 "Error:" /home/deploy/meta-chat-platform/logs/api-error.log | tail -30

   # Common patterns:
   # - Database connection errors
   # - Missing dependencies
   # - Configuration errors
   ```

2. **Memory leak hitting max_memory_restart (500MB)**
   ```bash
   # Check if restarts correlate with memory limit
   sudo -u deploy pm2 describe meta-chat-api | grep "max_memory_restart"

   # Monitor memory usage
   sudo -u deploy pm2 monit
   ```

3. **Database connection failure**
   ```bash
   # Test database connectivity
   docker exec meta-chat-postgres pg_isready -U metachat

   # Check connection pool
   docker exec meta-chat-postgres psql -U metachat -d metachat -c \
     "SELECT count(*) FROM pg_stat_activity WHERE datname='metachat';"
   ```

**Resolution:**

```bash
# Stop the restart loop temporarily
sudo -u deploy pm2 stop meta-chat-api

# Fix the underlying issue:
# - Database: restart database container
# - Memory: investigate leak and increase limit if needed
# - Code error: fix bug and redeploy

# Restart with monitoring
sudo -u deploy pm2 start meta-chat-api
sudo -u deploy pm2 logs meta-chat-api
```

---

### Issue: High Memory Usage

**Symptoms:**
- Process memory approaches or exceeds 400MB
- Process restarts due to memory limit
- Slow response times

**Diagnosis:**

```bash
# Check current memory usage
sudo -u deploy pm2 list

# Monitor memory over time
sudo -u deploy pm2 monit

# Check for memory leak pattern
sudo -u deploy pm2 describe meta-chat-api | grep -A 5 "Memory"

# View heap usage in metrics
curl http://localhost:3000/metrics | grep heap
```

**Common Causes:**

1. **Memory leak in application code**
2. **Large response bodies not being garbage collected**
3. **Too many concurrent connections**
4. **Large RAG document chunks in memory**

**Resolution:**

```bash
# Immediate: Restart process to free memory
sudo -u deploy pm2 restart meta-chat-api

# Short-term: Increase memory limit if justified
# Edit ecosystem.config.js:
# max_memory_restart: '800M'

# Long-term: Investigate and fix memory leak
# Enable heap snapshot on restart:
sudo -u deploy pm2 trigger meta-chat-api km:heapdump
# Analyze heap snapshot in Chrome DevTools
```

---

## Infrastructure Issues

### Issue: Database Connection Errors

**Symptoms:**
- Error logs show `ECONNREFUSED` or `Connection timeout`
- Health check shows database as `down`
- Application cannot process requests

**Diagnosis:**

```bash
# Check database container status
docker ps --filter 'name=meta-chat-postgres'

# Test database connectivity
docker exec meta-chat-postgres pg_isready -U metachat

# Check database logs
docker logs meta-chat-postgres --tail 50

# Verify connection string
grep DATABASE_URL /home/deploy/meta-chat-platform/ecosystem.config.js
```

**Common Causes:**

1. **Database container stopped**
   ```bash
   docker ps -a --filter 'name=meta-chat-postgres'
   ```

2. **Connection pool exhausted**
   ```bash
   docker exec meta-chat-postgres psql -U metachat -d metachat -c \
     "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
   ```

3. **Network issue**
   ```bash
   # Test connection from host
   nc -zv localhost 5432
   ```

**Resolution:**

```bash
# Restart database container
docker restart meta-chat-postgres

# Wait for healthy status
docker ps --filter 'name=meta-chat-postgres'

# Verify connection
docker exec meta-chat-postgres pg_isready -U metachat

# Restart application to reconnect
sudo -u deploy pm2 restart all

# If connection pool exhausted, kill idle connections:
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE state = 'idle' AND state_change < NOW() - INTERVAL '10 minutes';"
```

---

### Issue: Redis Connection Errors

**Symptoms:**
- Error logs show Redis connection failures
- Health check shows redis as `down`
- Session/cache features not working

**Diagnosis:**

```bash
# Check Redis container status
docker ps --filter 'name=meta-chat-redis'

# Test Redis connectivity
docker exec meta-chat-redis redis-cli ping

# Check Redis logs
docker logs meta-chat-redis --tail 50

# Check memory usage
docker exec meta-chat-redis redis-cli INFO memory
```

**Common Causes:**

1. **Redis container stopped**
2. **Redis out of memory**
3. **Too many connections**

**Resolution:**

```bash
# Restart Redis container
docker restart meta-chat-redis

# Verify connection
docker exec meta-chat-redis redis-cli ping

# Clear cache if needed
docker exec meta-chat-redis redis-cli FLUSHALL

# Restart applications
sudo -u deploy pm2 restart all
```

---

### Issue: RabbitMQ Queue Backlog

**Symptoms:**
- Worker logs show slow message processing
- Queue depth >1000 messages
- Messages delayed by minutes/hours

**Diagnosis:**

```bash
# Check RabbitMQ container status
docker ps --filter 'name=meta-chat-rabbitmq'

# Check queue depths
docker exec meta-chat-rabbitmq rabbitmqctl list_queues name messages consumers

# View queue details in management UI
# Open browser: http://localhost:15672 (guest/guest)

# Check worker logs for errors
sudo -u deploy pm2 logs meta-chat-worker --lines 100
```

**Common Causes:**

1. **Worker process stopped or slow**
   ```bash
   sudo -u deploy pm2 list | grep worker
   ```

2. **Message processing errors causing retries**
   ```bash
   grep "ERROR" /home/deploy/meta-chat-platform/logs/worker-out.log | tail -50
   ```

3. **High message volume overwhelming worker**
   ```bash
   # Check processing rate
   docker exec meta-chat-rabbitmq rabbitmqctl list_queues name message_stats
   ```

**Resolution:**

```bash
# Restart worker to process backlog
sudo -u deploy pm2 restart meta-chat-worker

# Monitor processing
sudo -u deploy pm2 logs meta-chat-worker

# If messages stuck due to errors, purge dead letter queue
docker exec meta-chat-rabbitmq rabbitmqctl purge_queue meta-chat.dlq

# Scale workers (temporary - requires code changes for multi-instance)
# For now, ensure single worker is running efficiently
```

---

## API Issues

### Issue: 500 Internal Server Errors

**Symptoms:**
- HTTP 500 responses
- Error logs show unhandled exceptions
- Specific endpoints failing

**Diagnosis:**

```bash
# Find recent 500 errors
grep '"statusCode":500' /home/deploy/meta-chat-platform/logs/api-out.log | tail -20

# View detailed error logs
sudo -u deploy pm2 logs meta-chat-api --err --lines 50

# Check which endpoints are failing
grep '"statusCode":500' /home/deploy/meta-chat-platform/logs/api-out.log | \
  grep -o '"route":"[^"]*"' | sort | uniq -c | sort -rn
```

**Common Causes:**

1. **Database query errors**
2. **Null reference errors**
3. **Third-party API failures (LLM providers)**
4. **Missing tenant configuration**

**Resolution:**

```bash
# Check error details for stack trace
tail -100 /home/deploy/meta-chat-platform/logs/api-error.log

# Fix code issue and redeploy
cd /home/deploy/meta-chat-platform
sudo -u deploy git pull
sudo -u deploy npm run build
sudo -u deploy pm2 restart meta-chat-api

# Verify fix
curl -i http://localhost:3000/health
```

---

### Issue: Slow Response Times

**Symptoms:**
- API responses >1 second
- Timeout errors
- Poor user experience

**Diagnosis:**

```bash
# Find slow requests (>1000ms)
grep "durationMs" /home/deploy/meta-chat-platform/logs/api-out.log | \
  awk -F'"durationMs":' '{print $2}' | \
  awk -F',' '{if ($1 > 1000) print $0}' | \
  sort -t: -k2 -rn | head -20

# Check database query performance
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT query, calls, mean_exec_time, max_exec_time
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;"

# Monitor real-time performance
curl http://localhost:3000/metrics | grep http_request_duration
```

**Common Causes:**

1. **Slow database queries**
2. **RAG vector search without proper indexes**
3. **LLM API timeout/throttling**
4. **High concurrency overwhelming single process**

**Resolution:**

```bash
# Optimize database queries (see maintenance.md)

# Check vector index exists
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT indexname FROM pg_indexes WHERE tablename = 'chunks';"

# Restart process to clear any stuck requests
sudo -u deploy pm2 restart meta-chat-api

# Monitor improvement
sudo -u deploy pm2 logs meta-chat-api | grep durationMs
```

---

## Worker Issues

### Issue: Messages Not Processing

**Symptoms:**
- WhatsApp/Messenger messages not getting responses
- Worker logs show no activity
- Queue depth increasing

**Diagnosis:**

```bash
# Check worker process status
sudo -u deploy pm2 list | grep worker

# View worker logs
sudo -u deploy pm2 logs meta-chat-worker --lines 100

# Check RabbitMQ queues
docker exec meta-chat-rabbitmq rabbitmqctl list_queues

# Verify tenant channels are enabled
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT t.name, c.type, c.enabled FROM channels c
   JOIN tenants t ON c.\"tenantId\" = t.id;"
```

**Common Causes:**

1. **Worker process crashed**
2. **No consumers attached to queues**
3. **Tenant channels disabled**
4. **LLM provider API errors**

**Resolution:**

```bash
# Restart worker process
sudo -u deploy pm2 restart meta-chat-worker

# Verify consumers registered
docker exec meta-chat-rabbitmq rabbitmqctl list_consumers

# Check worker logs for startup errors
sudo -u deploy pm2 logs meta-chat-worker --lines 50

# Test message processing manually
# Send test message via webhook or dashboard
```

---

## Configuration Issues

### Issue: Environment Variables Not Loading

**Symptoms:**
- Processes fail to start with config errors
- Features not working as expected
- Logs show undefined configuration values

**Diagnosis:**

```bash
# Check ecosystem.config.js
cat /home/deploy/meta-chat-platform/ecosystem.config.js | grep -A 30 "env:"

# Verify .env.production exists
ls -la /home/deploy/meta-chat-platform/apps/api/.env.production

# Check process environment
sudo -u deploy pm2 describe meta-chat-api | grep -A 50 "env:"
```

**Resolution:**

```bash
# Reload configuration
cd /home/deploy/meta-chat-platform
source apps/api/.env.production

# Update ecosystem.config.js if needed
# Then reload PM2
sudo -u deploy pm2 reload ecosystem.config.js

# Or restart processes
sudo -u deploy pm2 restart all
```

---

## Performance Issues

### Issue: High CPU Usage

**Symptoms:**
- CPU usage >80% sustained
- Slow response times
- Process unresponsive

**Diagnosis:**

```bash
# Check process CPU usage
sudo -u deploy pm2 list

# Monitor CPU over time
sudo -u deploy pm2 monit

# Check system CPU usage
top -u deploy

# View CPU metrics
curl http://localhost:3000/metrics | grep cpu
```

**Common Causes:**

1. **Infinite loop in code**
2. **Heavy LLM processing**
3. **Large document chunking**
4. **Vector similarity calculations**

**Resolution:**

```bash
# Immediate: Restart process
sudo -u deploy pm2 restart <process>

# Generate CPU profile for analysis
sudo -u deploy pm2 trigger meta-chat-api km:cpu:profiling:start
# Wait 30 seconds
sudo -u deploy pm2 trigger meta-chat-api km:cpu:profiling:stop

# Analyze profile and optimize code
```

---

## Log Issues

### Issue: Disk Space Full from Logs

**Symptoms:**
- Disk usage >90%
- Processes crashing with "ENOSPC" errors
- Log rotation failing

**Diagnosis:**

```bash
# Check disk usage
df -h /home/deploy/meta-chat-platform/logs/

# Find largest log files
du -sh /home/deploy/meta-chat-platform/logs/* | sort -rh | head -10

# Check log rotation status
sudo -u deploy pm2 logs pm2-logrotate --lines 50
```

**Resolution:**

```bash
# Emergency: Manually delete old rotated logs
cd /home/deploy/meta-chat-platform/logs/
sudo -u deploy rm -f *__2025-11-1[0-5]*.log

# Verify log rotation is working
sudo -u deploy pm2 list | grep logrotate

# If logrotate stopped, restart it
sudo -u deploy pm2 restart pm2-logrotate

# Flush PM2 log buffer
sudo -u deploy pm2 flush

# Configure more aggressive rotation (edit ecosystem.config.js)
# Consider reducing retention from 7 days to 3 days
```

---

## Network Issues

### Issue: Cannot Access API from External Network

**Symptoms:**
- API works on localhost but not from external IP
- Health checks fail from monitoring service
- Clients cannot connect

**Diagnosis:**

```bash
# Check if API is listening on correct port
sudo netstat -tlnp | grep 3000

# Check firewall rules
sudo ufw status

# Test from localhost
curl http://localhost:3000/health

# Test from external IP
curl http://100.97.156.41:3000/health
```

**Resolution:**

```bash
# Open firewall port if needed
sudo ufw allow 3000/tcp

# Check Nginx configuration
sudo nginx -t
sudo systemctl status nginx

# Restart Nginx if needed
sudo systemctl restart nginx

# Verify API is accessible
curl https://chat.genai.hr/health
```

---

## Confidence Escalation Issues

### Issue: All Messages Escalating to Human

**Symptoms:**
- High escalation rate (>50%)
- Conversations immediately marked for human handoff
- Too many false positives

**Diagnosis:**

```bash
# Check escalation rate
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT COUNT(*) FILTER (WHERE type = 'human_handoff.requested') as escalations,
          COUNT(DISTINCT \"conversationId\") as total_conversations
   FROM events
   WHERE \"createdAt\" > NOW() - INTERVAL '24 hours';"

# Check tenant configuration
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "SELECT name, settings->'confidenceEscalation'
   FROM tenants WHERE id = 'YOUR_TENANT_ID';"
```

**Resolution:**

```bash
# Adjust thresholds in tenant settings:
# - Switch from "strict" to "standard" or "lenient" mode
# - Increase threshold values
# - Disable disclaimers if too aggressive

# Update via dashboard or directly in database:
docker exec meta-chat-postgres psql -U metachat -d metachat -c \
  "UPDATE tenants
   SET settings = jsonb_set(
     settings,
     '{confidenceEscalation,mode}',
     '\"lenient\"'
   )
   WHERE id = 'YOUR_TENANT_ID';"
```

---

## Emergency Procedures

### Complete System Restart

```bash
# 1. Stop all PM2 processes
sudo -u deploy pm2 stop all

# 2. Restart infrastructure services
docker restart meta-chat-postgres meta-chat-redis meta-chat-rabbitmq

# 3. Wait for services to be healthy (30 seconds)
sleep 30

# 4. Verify infrastructure health
docker ps --filter 'name=meta-chat'

# 5. Start PM2 processes
sudo -u deploy pm2 restart all

# 6. Monitor startup
sudo -u deploy pm2 logs

# 7. Verify health
curl http://localhost:3000/health
```

### Rollback Deployment

```bash
# 1. Stop processes
sudo -u deploy pm2 stop all

# 2. Revert code
cd /home/deploy/meta-chat-platform
sudo -u deploy git log --oneline -5  # Find previous commit
sudo -u deploy git checkout <previous-commit-hash>

# 3. Rebuild
sudo -u deploy npm run build

# 4. Restart
sudo -u deploy pm2 restart all

# 5. Verify
curl http://localhost:3000/health
```

---

## Getting Help

### Collecting Diagnostic Information

When reporting an issue, collect this information:

```bash
# 1. Process status
sudo -u deploy pm2 list > /tmp/pm2-status.txt

# 2. Recent logs
sudo -u deploy pm2 logs --lines 200 --nostream > /tmp/pm2-logs.txt

# 3. Error logs
tail -200 /home/deploy/meta-chat-platform/logs/*-error.log > /tmp/error-logs.txt

# 4. System info
df -h > /tmp/disk-usage.txt
free -h > /tmp/memory-usage.txt
docker ps -a > /tmp/docker-status.txt

# 5. Health check
curl http://localhost:3000/health > /tmp/health-check.txt 2>&1

# 6. Package this info
tar -czf /tmp/diagnostic-$(date +%Y%m%d-%H%M%S).tar.gz \
  /tmp/pm2-status.txt \
  /tmp/pm2-logs.txt \
  /tmp/error-logs.txt \
  /tmp/disk-usage.txt \
  /tmp/memory-usage.txt \
  /tmp/docker-status.txt \
  /tmp/health-check.txt
```

---

## Related Documentation

- [Monitoring Guide](./monitoring.md) - Monitoring setup and dashboards
- [Maintenance Procedures](./maintenance.md) - Routine maintenance tasks
- [Deployment Guide](/home/deploy/meta-chat-platform/docs/DEPLOYMENT.md) - Deployment procedures
- [Architecture Overview](/home/deploy/meta-chat-platform/docs/ARCHITECTURE.md) - System architecture

---

**Document Version:** 1.0
**Next Review:** 2025-12-18
**Questions/Updates:** Contact Operations Team
