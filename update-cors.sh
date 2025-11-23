#!/bin/bash
# Script to update CORS origins for widget embedding
# Add client domains here separated by commas

echo "Current CORS setting:"
grep '^API_CORS_ORIGINS=' .env || echo "API_CORS_ORIGINS not set"

echo ""
echo "To allow widgets to be embedded on client websites, update API_CORS_ORIGINS in .env:"
echo "Example:"
echo "API_CORS_ORIGINS=https://chat.genai.hr,https://www.chat.genai.hr,https://client1.com,https://client2.com"
echo ""
echo "Then run: pm2 restart meta-chat-api --update-env"
