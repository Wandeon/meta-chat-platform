#!/bin/bash
# Simple monitoring script for Meta Chat Platform

LOG_FILE="/var/log/metachat-monitor.log"
HEALTH_ENDPOINT="http://localhost:3000/api/health"
ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_health() {
  response=$(curl -s -w "\n%{http_code}" "$HEALTH_ENDPOINT" 2>/dev/null)
  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | head -n -1)
  
  if [ "$http_code" != "200" ]; then
    log "ERROR: Health check failed with status $http_code"
    log "Response: $body"
    return 1
  fi
  
  # Check if jq is available
  if command -v jq &> /dev/null; then
    status=$(echo "$body" | jq -r '.status' 2>/dev/null || echo "unknown")
    if [ "$status" != "healthy" ]; then
      log "WARNING: System status is $status"
      log "Details: $body"
      return 2
    fi
  fi
  
  log "INFO: Health check passed"
  return 0
}

check_disk_space() {
  usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
  if [ "$usage" -gt 90 ]; then
    log "ERROR: Disk usage at ${usage}%"
    return 1
  elif [ "$usage" -gt 80 ]; then
    log "WARNING: Disk usage at ${usage}%"
    return 2
  fi
  log "INFO: Disk usage at ${usage}%"
  return 0
}

check_pm2_processes() {
  # Check if PM2 is available for deploy user
  if ! sudo -u deploy pm2 jlist > /tmp/pm2-status.json 2>/dev/null; then
    log "ERROR: Cannot get PM2 status"
    return 1
  fi
  
  # Check if jq is available
  if ! command -v jq &> /dev/null; then
    log "WARNING: jq not installed, skipping detailed PM2 checks"
    return 0
  fi
  
  # Check if API is running
  api_status=$(jq -r '.[] | select(.name=="meta-chat-api") | .pm2_env.status' /tmp/pm2-status.json 2>/dev/null || echo "not_found")
  if [ "$api_status" != "online" ]; then
    log "ERROR: API process status is $api_status"
    return 1
  fi
  
  # Check restart count
  restart_count=$(jq -r '.[] | select(.name=="meta-chat-api") | .pm2_env.restart_time' /tmp/pm2-status.json 2>/dev/null || echo "0")
  if [ "$restart_count" -gt 10 ]; then
    log "WARNING: API has restarted $restart_count times"
    return 2
  fi
  
  log "INFO: PM2 processes healthy"
  return 0
}

check_database() {
  if docker exec meta-chat-postgres pg_isready -U metachat > /dev/null 2>&1; then
    log "INFO: Database is healthy"
    return 0
  else
    log "ERROR: Database is not accepting connections"
    return 1
  fi
}

# Run all checks
log "=== Starting health checks ==="
all_healthy=true

check_health || all_healthy=false
check_disk_space || all_healthy=false
check_pm2_processes || all_healthy=false
check_database || all_healthy=false

if [ "$all_healthy" = true ]; then
  log "=== All checks passed ==="
  exit 0
else
  log "=== Some checks failed ==="
  exit 1
fi
