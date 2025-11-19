# Monitoring & Alerting

## Health Endpoints

### Main Health Check
```bash
curl https://chat.genai.hr/api/health
```

Returns:
- `status`: healthy, degraded, or unhealthy  
- `services`: Database, memory, process status
- `errors`: List of issues (if any)

### Liveness Probe
```bash
curl https://chat.genai.hr/api/health/live
```

### Readiness Probe
```bash
curl https://chat.genai.hr/api/health/ready
```

## Monitoring Script

Located at `scripts/monitor.sh`

Checks:
- API health endpoint
- Disk space usage
- PM2 process status
- Database connectivity

Runs automatically every 5 minutes via cron.

## Manual Checks

### View PM2 Status
```bash
pm2 status
pm2 monit
```

### View Logs
```bash
pm2 logs meta-chat-api
pm2 logs meta-chat-api --lines 100
```

### View Monitoring Logs
```bash
tail -f /var/log/metachat-monitor.log
```

### Check Database
```bash
docker exec meta-chat-postgres pg_isready -U metachat
```

### Check Disk Space
```bash
df -h
```

### Check Memory
```bash
free -h
```

## Alerts

Configure Telegram alerts:
```bash
export TELEGRAM_BOT_TOKEN="your-bot-token"
export TELEGRAM_CHAT_ID="your-chat-id"
```

Test alert:
```bash
./scripts/alert.sh "Test alert"
```

## Future Enhancements

- Prometheus metrics endpoint
- Grafana dashboard
- Email alerts
- Slack integration
- Request tracing
- Error tracking (Sentry)
