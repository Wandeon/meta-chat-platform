# Logging Configuration

## Overview
The Meta Chat Platform implements a comprehensive logging strategy with automatic rotation, compression, and retention policies to manage log file growth and disk usage.

## Log Rotation System

### Primary: pm2-logrotate
PM2's log rotation module handles automatic rotation of application logs.

**Configuration:**
- **Max Size**: 100MB per file (rotates when file reaches this size)
- **Retention**: 30 rotated files kept
- **Compression**: Enabled (gzip)
- **Date Format**: YYYY-MM-DD_HH-mm-ss
- **Worker Interval**: 30 seconds (check frequency)
- **Rotate Interval**: Daily at midnight (0 0 * * *)

**View Configuration:**
```bash
pm2 conf pm2-logrotate
```

**Update Settings:**
```bash
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:workerInterval 30
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
pm2 save
```

### Secondary: System Logrotate (Optional)
A fallback logrotate configuration is available at `scripts/meta-chat-logrotate`.

To install system-wide (requires sudo):
```bash
sudo cp scripts/meta-chat-logrotate /etc/logrotate.d/meta-chat
sudo chmod 644 /etc/logrotate.d/meta-chat
```

## Log Locations

### PM2 Logs
- **Path**: `~/.pm2/logs/`
- **Files**: 
  - `meta-chat-api-out.log` - API output logs
  - `meta-chat-api-error.log` - API error logs
  - `meta-chat-worker-out.log` - Worker output logs
  - `meta-chat-worker-error.log` - Worker error logs
- **Rotated Files**: `*__YYYY-MM-DD_HH-mm-ss.log` or `*.log.gz`

### Application Logs
- **Path**: `/home/deploy/meta-chat-platform/logs/`
- **Files**: Same naming convention as PM2 logs
- **Size**: Monitored by pm2-logrotate

## Log Retention Policy

| Log Type | Retention Period | Rationale |
|----------|-----------------|-----------|
| Output Logs | 30 days | Standard operational logs |
| Error Logs | 90 days | Extended retention for debugging |
| Compressed Logs | 30 rotations | Space-efficient long-term storage |

## Automated Cleanup

### Weekly Cleanup Script
A cron job runs every Sunday at 3 AM to clean old logs:

```bash
# Cron entry
0 3 * * 0 /home/deploy/meta-chat-platform/scripts/cleanup-logs.sh >> /home/deploy/meta-chat-platform/logs/cleanup.log 2>&1
```

**Script Actions:**
1. Removes output logs older than 30 days
2. Removes error logs older than 90 days
3. Removes old application logs
4. Compresses large uncompressed logs (>10MB)
5. Reports disk usage before and after

### Manual Cleanup
Run the cleanup script manually anytime:
```bash
cd /home/deploy/meta-chat-platform
./scripts/cleanup-logs.sh
```

## Manual Operations

### View Logs
```bash
# View all logs
pm2 logs

# View specific app logs
pm2 logs meta-chat-api
pm2 logs meta-chat-worker

# View last N lines
pm2 logs meta-chat-api --lines 100

# Stream logs
pm2 logs meta-chat-api --raw
```

### Flush Logs
Clear current log files (doesn't affect rotated logs):
```bash
pm2 flush
```

### Force Rotation
Manually trigger log rotation:
```bash
pm2 reloadLogs
```

### Check Log Status
```bash
# Check PM2 log sizes
du -sh ~/.pm2/logs/
ls -lh ~/.pm2/logs/

# Check application log sizes
du -sh /home/deploy/meta-chat-platform/logs/
ls -lh /home/deploy/meta-chat-platform/logs/
```

## Monitoring and Alerts

### Disk Space Monitoring
Check available disk space regularly:
```bash
df -h /home
```

**Warning Threshold:** Alert if disk usage > 80%
**Critical Threshold:** Alert if disk usage > 90%

### Log Growth Monitoring
Monitor log directory sizes:
```bash
# Total log disk usage
du -sh ~/.pm2/logs/ /home/deploy/meta-chat-platform/logs/

# Largest log files
find ~/.pm2/logs /home/deploy/meta-chat-platform/logs -type f -exec ls -lh {} \; | sort -k5 -rh | head -10
```

## Troubleshooting

### Logs Growing Too Fast
If logs exceed 100MB frequently:
1. Review log level settings (reduce to 'warn' in production)
2. Check for excessive verbose logging in code
3. Investigate if application is in a loop or error state
4. Consider reducing `workerInterval` to check more frequently

### Rotation Not Working
```bash
# Check pm2-logrotate status
pm2 list

# Restart pm2-logrotate
pm2 restart pm2-logrotate

# Check pm2-logrotate logs
pm2 logs pm2-logrotate
```

### Disk Space Still High
```bash
# Find large files
find /home/deploy/meta-chat-platform -type f -size +100M

# Check for old compressed logs
find /home/deploy/meta-chat-platform/logs -name "*.gz" -mtime +30

# Manually clean old compressed logs
find /home/deploy/meta-chat-platform/logs -name "*.gz" -mtime +30 -delete
```

## Best Practices

1. **Monitor Regularly**: Check log sizes weekly
2. **Review Cleanup Logs**: Verify weekly cleanup is running
3. **Set Alerts**: Configure disk space alerts at 80% usage
4. **Adjust Retention**: Modify retention policies based on compliance needs
5. **Compress Proactively**: Large logs are automatically compressed
6. **Archive Important Logs**: Move critical error logs to backup before rotation

## Configuration Files

- **PM2 Ecosystem**: `ecosystem.config.js`
- **Cleanup Script**: `scripts/cleanup-logs.sh`
- **Logrotate Config**: `scripts/meta-chat-logrotate`
- **Crontab**: `crontab -l` (user: admin)

## Emergency Procedures

### Disk Full Emergency
If disk reaches 100%:
```bash
# Immediately compress all logs
find /home/deploy/meta-chat-platform/logs -name "*.log" -size +10M -exec gzip {} \;

# Remove oldest rotated logs
find /home/deploy/meta-chat-platform/logs -name "*__*.log.gz" -mtime +7 -delete

# Flush current PM2 logs
pm2 flush

# Restart applications with new log files
pm2 restart all
```

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2025-11-21 | Initial log retention configuration | System Admin |
| 2025-11-21 | pm2-logrotate: 100MB max, 30 day retention | System Admin |
| 2025-11-21 | Weekly automated cleanup via cron | System Admin |
