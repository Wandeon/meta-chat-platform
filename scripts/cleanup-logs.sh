#!/bin/bash
set -e

echo "=== Log Cleanup Script ==="
echo "Timestamp: $(date)"
echo ""

# Configuration
LOG_DIR="${HOME}/.pm2/logs"
APP_LOG_DIR="/home/deploy/meta-chat-platform/logs"
RETENTION_DAYS=30
ERROR_RETENTION_DAYS=90

echo "1. Checking log directories..."
echo "   PM2 logs: $LOG_DIR"
echo "   App logs: $APP_LOG_DIR"
echo ""

# Show current log usage
echo "2. Current log disk usage:"
du -sh $LOG_DIR 2>/dev/null || echo "   PM2 logs directory not found"
du -sh $APP_LOG_DIR 2>/dev/null || echo "   App logs directory not found"
echo ""

# Clean old PM2 logs (except errors)
echo "3. Cleaning PM2 logs older than $RETENTION_DAYS days..."
if [ -d "$LOG_DIR" ]; then
  find $LOG_DIR -name "*-out-*.log*" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
  echo "   ✅ Cleaned old output logs"
else
  echo "   ⚠️  PM2 logs directory not found"
fi

# Clean old error logs (longer retention)
echo "4. Cleaning error logs older than $ERROR_RETENTION_DAYS days..."
if [ -d "$LOG_DIR" ]; then
  find $LOG_DIR -name "*-error-*.log*" -type f -mtime +$ERROR_RETENTION_DAYS -delete 2>/dev/null || true
  echo "   ✅ Cleaned old error logs"
fi

# Clean application logs
echo "5. Cleaning application logs..."
if [ -d "$APP_LOG_DIR" ]; then
  find $APP_LOG_DIR -name "*.log" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
  find $APP_LOG_DIR -name "*.log.*" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
  echo "   ✅ Cleaned application logs"
else
  echo "   ⚠️  Application logs directory not found"
fi

# Compress large logs
echo "6. Compressing large uncompressed logs..."
if [ -d "$LOG_DIR" ]; then
  find $LOG_DIR -name "*.log" -type f -size +10M -exec gzip {} \; 2>/dev/null || true
  echo "   ✅ Compressed large PM2 logs"
fi
if [ -d "$APP_LOG_DIR" ]; then
  find $APP_LOG_DIR -name "*.log" -type f -size +10M -exec gzip {} \; 2>/dev/null || true
  echo "   ✅ Compressed large app logs"
fi

# Show new log usage
echo ""
echo "7. New log disk usage:"
du -sh $LOG_DIR 2>/dev/null || echo "   PM2 logs directory not found"
du -sh $APP_LOG_DIR 2>/dev/null || echo "   App logs directory not found"
echo ""

echo "=== Cleanup Complete ==="
