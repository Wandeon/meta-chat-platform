# Messaging Channels

**Last Updated:** 2025-11-18  
**Status:** ✅ Current  
**Maintainer:** Integration Team

## Overview

The Meta Chat Platform supports three primary messaging channels to reach customers where they are:

- **WebChat** - Embeddable real-time chat widget for websites
- **WhatsApp Business API** - Integration with WhatsApp for Business messaging
- **Facebook Messenger** - Facebook Page messaging integration

All channels are built on a unified architecture that normalizes incoming messages into a common format and routes them through the orchestration pipeline for AI processing, RAG augmentation, and response generation.

### Key Capabilities

- Multi-channel support - Single platform, multiple customer touchpoints
- Unified message format - All channels normalized to consistent internal representation
- Real-time processing - Message queue-based orchestration with RabbitMQ
- Channel-specific features - Media handling, typing indicators, location sharing
- Webhook security - Signature verification for all external webhooks
- Bi-directional messaging - Send and receive messages through each channel

## Architecture

### Channel Adapter Pattern

Each channel implements the ChannelAdapter abstract class, providing a consistent interface for verify, receive, and send operations.

**Package Location:** packages/channels/

### Message Normalization

All incoming messages are converted to the NormalizedMessage format with standardized fields for id, conversationId, direction, from, timestamp, type, content, and metadata.

**Source:** packages/shared/src/types.ts

### Message Routing Flow

1. Webhook/Socket.IO Event
2. Channel Adapter (verify + normalize)
3. Message Queue (RabbitMQ - inbound queue)
4. Message Orchestrator (worker process)
5. Message Pipeline (RAG + LLM + Functions)
6. Response Queue (RabbitMQ - outbound queue)
7. Channel Adapter (send)
8. Customer receives response

**Worker Implementation:** apps/worker/src/index.ts

### Queue Architecture

The platform uses RabbitMQ for asynchronous message processing:

- Inbound Queue: {tenantId}:{channel}:inbound - Messages received from customers
- Outbound Queue: {tenantId}:{channel}:outbound - Responses to be sent
- Visibility Timeout: 5 minutes (configurable via WORKER_VISIBILITY_TIMEOUT_MS)
- Retry Policy: Max 3 retries with exponential backoff

**Configuration:** Environment variable RABBITMQ_URL required

## Channel Implementations

### WebChat

Real-time chat widget using Socket.IO for bidirectional WebSocket communication.

#### Architecture

- Transport: Socket.IO (WebSocket with fallback to long-polling)
- Authentication: Token-based via handshake auth
- Connection Model: One socket per user session
- Room Pattern: Each conversation is a Socket.IO room for broadcasting

#### Configuration

Channel type: webchat
Config: enabled, allowedOrigins, token (optional authentication token)

#### Implementation Details

**Adapter:** packages/channels/src/webchat/webchat-adapter.ts

**Key Features:**
- CORS configuration for allowed origins
- Socket.IO room-based message broadcasting
- Real-time typing indicators
- Client-side message validation
- Automatic reconnection handling

**Authentication Flow:**
- socket.handshake.auth includes tenantId, conversationId, userId, and optional token

**Event Types:**
- message - Send/receive chat messages
- typing - Typing indicator (on/off)
- connection - Connection status events

#### Widget Embedding

**Widget Package:** apps/web-widget/

Basic embedding uses window.MetaChatWidget function with element, configUrl, token, and onEvent parameters.

**Build Command:**
```bash
npm run build -- --filter @meta-chat/web-widget
```

### WhatsApp Business API

Integration with Meta's WhatsApp Business Platform using the Cloud API.

#### Architecture

- API Version: Graph API v17.0
- Authentication: Bearer token (access token)
- Webhook Security: HMAC-SHA256 signature validation
- Media Handling: Upload/download via Graph API media endpoints

#### Configuration

Channel type: whatsapp
Config: phoneNumberId, businessAccountId, webhookVerifyToken
Secrets: accessToken (Graph API access token), appSecret (webhook signature verification)

#### Implementation Details

**Adapter:** packages/channels/src/whatsapp/whatsapp-adapter.ts

**Supported Message Types:**
- Text messages
- Image, audio, video, document (with upload/download)
- Location sharing
- Context/quoted replies (metadata)

**Media Flow:**

Receiving Media:
1. Webhook contains media ID
2. Call GET /{media_id} to get media URL
3. Download from returned URL with access token
4. Store or process media

Sending Media:
1. Download media from URL
2. Upload to WhatsApp: POST /{phone_number_id}/media
3. Get media ID
4. Send message with media ID

**API Methods:**
- downloadMedia(mediaId): Returns data, mimeType, sha256, url
- uploadMediaFromUrl(url, mimeType, filename): Returns media id

#### Webhook Endpoints

**Verification (GET):**
- Route: /api/integrations/whatsapp/:tenantId
- Query: hub.mode=subscribe, hub.verify_token, hub.challenge
- Response: Challenge string (if token matches)

**Message Receipt (POST):**
- Route: /api/integrations/whatsapp/:tenantId
- Headers: x-hub-signature-256: sha256=...
- Body: WhatsApp webhook payload

**Signature Verification:**
Uses HMAC-SHA256 with appSecret and timingSafeEqual for constant-time comparison

**Routes:** apps/api/src/routes/webhookIntegrations.ts

### Facebook Messenger

Integration with Facebook Messenger Platform for Facebook Page messaging.

#### Architecture

- API Version: Graph API v17.0
- Authentication: Page access token
- Webhook Security: HMAC-SHA256 signature validation (x-hub-signature-256)
- Messaging Type: RESPONSE (24-hour messaging window)

#### Configuration

Channel type: messenger
Config: pageId, verifyToken
Secrets: pageAccessToken, appSecret

#### Implementation Details

**Adapter:** packages/channels/src/messenger/messenger-adapter.ts

**Supported Features:**
- Text messages
- Media attachments (image, audio, video, file)
- Location sharing
- Typing indicators (typing_on, typing_off, mark_seen)
- Quick replies (metadata)

**Typing Indicators:**
- setTypingIndicator(recipientId, action): Supports typing_on, typing_off, mark_seen

**Message Structure:**

Inbound: Page object with entry array containing messaging events
Outbound: messaging_type RESPONSE with recipient id and message content

#### Webhook Endpoints

**Verification (GET):**
- Route: /api/integrations/messenger/:tenantId
- Query: hub.mode=subscribe, hub.verify_token, hub.challenge
- Response: Challenge string (if token matches)

**Message Receipt (POST):**
- Route: /api/integrations/messenger/:tenantId
- Headers: x-hub-signature-256: sha256=...
- Body: Messenger webhook payload

**Routes:** apps/api/src/routes/webhookIntegrations.ts

## Deployment & Setup

### Database Schema

Channels are stored in the channels table with fields: id, tenant_id, type (whatsapp/messenger/webchat), config (JSONB), secrets (JSONB encrypted), enabled, created_at, updated_at

### API Endpoints

**Channel Management:**

- GET /api/admin/channels?tenantId={tenantId} - List channels
- POST /api/admin/channels - Create channel
- PATCH /api/admin/channels/:channelId - Update channel
- DELETE /api/admin/channels/:channelId - Delete channel

**Routes:** apps/api/src/routes/channels.ts

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/metachat

# Message Queue
RABBITMQ_URL=amqp://user:pass@localhost:5672

# Worker Configuration
WORKER_VISIBILITY_TIMEOUT_MS=300000
WORKER_MAX_RETRIES=3
WORKER_PREFETCH=5
ENABLE_CONFIDENCE_ESCALATION=true

# WhatsApp (optional defaults)
WHATSAPP_VERIFY_TOKEN=default_verify_token
WHATSAPP_ACCESS_TOKEN=default_access_token
WHATSAPP_APP_SECRET=default_app_secret

# Messenger (optional defaults)
MESSENGER_VERIFY_TOKEN=default_verify_token
MESSENGER_PAGE_ACCESS_TOKEN=default_page_token
MESSENGER_APP_SECRET=default_app_secret

# WebChat (optional)
WEBCHAT_SHARED_TOKEN=shared_secret
```

### Setting Up WhatsApp

1. Create WhatsApp Business Account at business.facebook.com
2. Configure Webhook URL: https://api.example.com/api/integrations/whatsapp/{tenantId}
3. Set Verify Token (matches config.webhookVerifyToken)
4. Subscribe to Webhook Fields: messages
5. Create Channel Record via API with phoneNumberId, businessAccountId, webhookVerifyToken in config; accessToken and appSecret in secrets

### Setting Up Messenger

1. Create Facebook App at developers.facebook.com
2. Add Messenger Product
3. Generate Page Access Token
4. Configure Webhook URL: https://api.example.com/api/integrations/messenger/{tenantId}
5. Set Verify Token (matches config.verifyToken)
6. Subscribe to Page: messages, messaging_postbacks
7. Create Channel Record via API with pageId, verifyToken in config; pageAccessToken and appSecret in secrets

### Setting Up WebChat

1. Build Widget: npm run build -- --filter @meta-chat/web-widget
2. Deploy Widget Assets to CDN or static hosting
3. Create Channel Record via API with enabled, allowedOrigins, token in config
4. Embed Widget on website using provided HTML snippet

### Worker Process

The worker process orchestrates message handling across all channels:

```bash
# Start worker
npm run worker

# With PM2 (production)
pm2 start ecosystem.config.js --only worker
```

**Process:**
1. Loads all enabled tenants from database
2. Checks enabled channels per tenant (from tenant.settings)
3. Starts MessageOrchestrator for each tenant-channel pair
4. Consumes messages from inbound queues
5. Processes through MessagePipelineWithEscalation
6. Publishes responses to outbound queues

**Worker File:** apps/worker/src/index.ts

## API Reference

### Channel Adapter Factory

Use createChannelAdapter(context, options) to construct the correct adapter. Supply a Socket.IO Server when creating the Web Chat adapter.

Set a message handler with adapter.setMessageHandler(async (message) => {...}) to process inbound normalized events.

### Message Content Types

- Text message: type text with content.text
- Image message: type image with content.media (url, mimeType, filename, caption)
- Location message: type location with content.location (latitude, longitude, name, address)

### Normalization Utilities

**Location:** packages/channels/src/utils/normalization.ts

Functions: createNormalizedMessage, normalizeTextContent, normalizeMediaContent, normalizeLocationContent

## Operations

### Monitoring Channels

**Health Check:**
```bash
curl https://api.example.com/health
```

**Channel Status:**
```bash
curl https://api.example.com/api/admin/channels -H "Authorization: Bearer ADMIN_TOKEN"
curl "https://api.example.com/api/admin/channels?tenantId=tenant_123" -H "Authorization: Bearer ADMIN_TOKEN"
```

**Worker Logs:**
```bash
pm2 logs worker
tail -f /home/deploy/meta-chat-platform/logs/worker.log
```

**Queue Monitoring:**
RabbitMQ Management UI at http://localhost:15672 or use rabbitmqadmin list queues name messages

### Troubleshooting

#### WhatsApp Issues

**Problem:** Webhook not receiving messages

**Solution:**
1. Verify webhook URL is publicly accessible
2. Check signature validation (verify appSecret matches)
3. Confirm webhook subscription in WhatsApp Business Manager
4. Check application logs for signature validation errors

Test webhook verification:
```bash
curl "https://api.example.com/api/integrations/whatsapp/tenant_123?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
```

**Problem:** Media upload/download failing

**Solution:**
1. Verify accessToken has correct permissions
2. Check media URL expiration (WhatsApp media URLs expire)
3. Ensure sufficient storage/memory for media handling
4. Review Graph API error responses in logs

#### Messenger Issues

**Problem:** Messages not being delivered

**Solution:**
1. Verify 24-hour messaging window (RESPONSE messaging type)
2. Check page access token validity
3. Ensure page is subscribed to webhook
4. Verify user has not blocked the page

**Problem:** Typing indicators not working

**Solution:** Ensure typing indicator is sent before response and typing_off is sent after

#### WebChat Issues

**Problem:** Widget not connecting

**Solution:**
1. Check CORS configuration (allowedOrigins)
2. Verify WebSocket endpoint is accessible
3. Check browser console for connection errors
4. Confirm authentication token (if required)

**Problem:** Messages not persisting across page reloads

**Solution:**
- Ensure conversationId is stored in localStorage
- Retrieve message history from API on reconnection
- Implement conversation state management

#### Queue Issues

**Problem:** Messages stuck in queue

**Solution:**
1. Check worker process is running
2. Verify RabbitMQ connection
3. Check message prefetch settings
4. Review error logs for processing failures

Use rabbitmqctl list_queues to check queue depth

**Problem:** High retry count

**Solution:**
1. Review message processing logs
2. Check LLM provider availability
3. Verify database connectivity
4. Adjust retry/timeout settings

### Performance Tuning

**Worker Scaling:**
```bash
# Horizontal scaling
pm2 start ecosystem.config.js --only worker -i 4

# Vertical scaling
WORKER_PREFETCH=10 npm run worker
```

**Queue Configuration:**
```bash
WORKER_VISIBILITY_TIMEOUT_MS=600000
```

**Connection Pooling:**
- RabbitMQ: Reuse channels across consumers
- Database: Configure connection pool size in Prisma
- Socket.IO: Adjust pingTimeout and pingInterval

### Security Best Practices

1. Webhook Signatures: Always validate webhook signatures
2. Secret Storage: Store tokens in secrets (encrypted), not config
3. HTTPS Only: All webhook endpoints must use HTTPS
4. CORS: Restrict allowedOrigins for WebChat
5. Token Rotation: Regularly rotate access tokens
6. Rate Limiting: Implement per-tenant rate limits
7. Input Validation: Sanitize all incoming message content

## Code References

### Core Packages

- **Channel Adapters:** packages/channels/src/
  - adapter.ts - Base adapter class
  - webchat/webchat-adapter.ts - WebChat implementation
  - whatsapp/whatsapp-adapter.ts - WhatsApp implementation
  - messenger/messenger-adapter.ts - Messenger implementation
  - utils/normalization.ts - Message normalization utilities
  - types.ts - Type definitions

- **Shared Types:** packages/shared/src/types.ts
  - NormalizedMessage interface
  - ChannelType and message types
  - MessageContent structure

- **Orchestrator:** packages/orchestrator/src/
  - message-orchestrator.ts - Queue consumer and message routing
  - message-pipeline-with-escalation.ts - Message processing pipeline
  - channel-adapter.ts - Adapter registry

### Application Code

- **Worker:** apps/worker/src/index.ts
  - Tenant/channel discovery
  - Orchestrator initialization
  - Message processing

- **API Routes:** apps/api/src/routes/
  - channels.ts - Channel CRUD operations
  - webhookIntegrations.ts - Webhook endpoints for WhatsApp/Messenger
  - webhooks.ts - Generic webhook management

- **Web Widget:** apps/web-widget/src/
  - loader.tsx - Widget initialization
  - MetaChatWidget.tsx - Main widget component
  - hooks/useWidgetState.ts - State management

### Tests

- **Channel Tests:** packages/channels/tests/
  - Unit tests for each adapter
  - Webhook payload fixtures
  - Normalization test cases

## Related Documentation

- Architecture Overview: docs/ARCHITECTURE.md
- API Documentation: docs/API.md
- Deployment Guide: docs/DEPLOYMENT.md
- Widget Embedding Guide: docs/widget-embedding.md
- Confidence Escalation: docs/current/features/confidence-escalation.md

## Appendix

### Message Type Support Matrix

| Feature | WebChat | WhatsApp | Messenger |
|---------|---------|----------|-----------|
| Text | ✅ | ✅ | ✅ |
| Images | ✅ | ✅ | ✅ |
| Audio | ✅ | ✅ | ✅ |
| Video | ✅ | ✅ | ✅ |
| Documents | ✅ | ✅ | ✅ (as file) |
| Location | ✅ | ✅ | ✅ |
| Typing Indicators | ✅ | ❌ | ✅ |
| Read Receipts | ❌ | ❌ | ✅ (mark_seen) |
| Quick Replies | ✅ | ❌ | ✅ |

### Conversation ID Format

Each channel uses a specific conversation ID format:

- WebChat: User-provided conversationId from auth
- WhatsApp: {channelId}:{phone_number}
- Messenger: {channelId}:{user_psid}

This ensures conversations are scoped to the channel and can be uniquely identified across the platform.

### Rate Limits

**WhatsApp:**
- Cloud API: 1000 messages per second per business account
- Conversation limits apply based on tier

**Messenger:**
- Standard rate limit: 200 requests per hour per page
- Messaging rate: Based on page tier and user engagement

**WebChat:**
- Limited by server capacity and Socket.IO configuration
- Recommend implementing per-tenant rate limits

### Webhook Retry Behavior

**WhatsApp/Messenger:**
- Meta retries failed webhooks with exponential backoff
- Max retries: ~10 attempts over several hours
- Return 200 status quickly to acknowledge receipt

**Best Practice:** Acknowledge immediately, process asynchronously
