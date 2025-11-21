#!/bin/bash

# Analytics Job Health Check Script
# Verifies analytics job is running correctly on VPS-00

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Analytics Job Health Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Check if PM2 process is running
echo -e "${BLUE}[1/5] Checking PM2 process status...${NC}"
if pm2 describe meta-chat-analytics &>/dev/null; then
    STATUS=$(pm2 describe meta-chat-analytics | grep 'status' | head -1 | awk '{print $4}')
    if [ "$STATUS" == "online" ]; then
        echo -e "${GREEN}✓ Analytics process is running${NC}"
        pm2 describe meta-chat-analytics | grep -E 'status|uptime|restarts|memory'
    else
        echo -e "${RED}✗ Analytics process is not online (status: $STATUS)${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Analytics process not found in PM2${NC}"
    exit 1
fi
echo ""

# 2. Check logs for errors
echo -e "${BLUE}[2/5] Checking recent logs...${NC}"
if [ -f "./logs/analytics-error.log" ]; then
    ERROR_COUNT=$(tail -n 100 ./logs/analytics-error.log 2>/dev/null | wc -l)
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠ Found $ERROR_COUNT error log entries in last 100 lines${NC}"
        echo "Last 5 errors:"
        tail -n 5 ./logs/analytics-error.log
    else
        echo -e "${GREEN}✓ No errors in recent logs${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Error log file not found${NC}"
fi

if [ -f "./logs/analytics-out.log" ]; then
    echo "Last 5 output log entries:"
    tail -n 5 ./logs/analytics-out.log
fi
echo ""

# 3. Check cron schedule
echo -e "${BLUE}[3/5] Verifying cron schedule...${NC}"
EXPECTED_CRON="0 2 * * *"
if pm2 env meta-chat-analytics | grep -q "ANALYTICS_CRON=$EXPECTED_CRON"; then
    echo -e "${GREEN}✓ Cron schedule correctly set: $EXPECTED_CRON (Daily at 2:00 AM UTC)${NC}"
else
    ACTUAL_CRON=$(pm2 env meta-chat-analytics | grep ANALYTICS_CRON || echo "NOT SET")
    echo -e "${YELLOW}⚠ Cron schedule may differ from expected${NC}"
    echo "Expected: $EXPECTED_CRON"
    echo "Actual: $ACTUAL_CRON"
fi
echo ""

# 4. Check API health endpoint
echo -e "${BLUE}[4/5] Checking API health endpoint...${NC}"
# Get admin API key from environment
if [ -f "./apps/api/.env.production" ]; then
    ADMIN_KEY=$(grep ADMIN_API_KEY ./apps/api/.env.production | cut -d '=' -f 2- | tr -d '"' | tr -d "'")
fi

if [ -z "$ADMIN_KEY" ]; then
    echo -e "${YELLOW}⚠ Could not find admin API key, skipping health check${NC}"
else
    HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
        -H "X-Admin-API-Key: $ADMIN_KEY" \
        http://localhost:3000/api/analytics/health || echo "FAILED")

    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE:" | cut -d ':' -f 2)
    RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_CODE:/d')

    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✓ Health endpoint responding${NC}"
        echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
    else
        echo -e "${RED}✗ Health endpoint failed (HTTP $HTTP_CODE)${NC}"
        echo "$RESPONSE_BODY"
    fi
fi
echo ""

# 5. Check database for recent analytics data
echo -e "${BLUE}[5/5] Checking database for recent analytics data...${NC}"
# Extract database URL from env file
if [ -f "./apps/api/.env.production" ]; then
    DB_URL=$(grep DATABASE_URL ./apps/api/.env.production | cut -d '=' -f 2- | tr -d '"' | tr -d "'")

    if [ -n "$DB_URL" ]; then
        # Get date of most recent analytics entry
        QUERY="SELECT date, updated_at FROM analytics_daily ORDER BY updated_at DESC LIMIT 1;"
        RESULT=$(psql "$DB_URL" -t -c "$QUERY" 2>/dev/null || echo "FAILED")

        if [ "$RESULT" != "FAILED" ] && [ -n "$RESULT" ]; then
            echo -e "${GREEN}✓ Found recent analytics data:${NC}"
            echo "$RESULT"

            # Check if data is from yesterday or today
            LATEST_DATE=$(echo "$RESULT" | awk '{print $1}')
            YESTERDAY=$(date -u -d "yesterday" +%Y-%m-%d)
            TODAY=$(date -u +%Y-%m-%d)

            if [ "$LATEST_DATE" == "$YESTERDAY" ] || [ "$LATEST_DATE" == "$TODAY" ]; then
                echo -e "${GREEN}✓ Analytics data is current${NC}"
            else
                echo -e "${YELLOW}⚠ Latest analytics data is from $LATEST_DATE (may be outdated)${NC}"
            fi
        else
            echo -e "${YELLOW}⚠ Could not query database${NC}"
        fi
    fi
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Analytics Health Check Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "To view real-time logs:"
echo "  pm2 logs meta-chat-analytics"
echo ""
echo "To manually trigger analytics job:"
echo "  curl -X POST -H 'X-Admin-API-Key: YOUR_KEY' http://localhost:3000/api/analytics/trigger"
echo ""
