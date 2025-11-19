#!/bin/bash
# Alert script for critical issues

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

send_telegram_alert() {
  local message="$1"
  
  if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
    echo "Telegram not configured, skipping alert"
    return 1
  fi
  
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=${message}" \
    -d "parse_mode=HTML" > /dev/null
}

# Usage: ./alert.sh "Critical: API is down"
send_telegram_alert "$1"
