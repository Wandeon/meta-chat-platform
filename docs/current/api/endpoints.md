# API Endpoints Reference

**Last Updated:** 2025-11-18
**Status:** ✅ Current
**Maintainer:** API Team

## Overview

The Meta Chat Platform API provides REST endpoints for managing multi-tenant chat operations, document management, conversation tracking, and webhook integrations.

**Base URL:** `https://chat.genai.hr/api`

**API Version:** v1 (current)

All REST endpoints return responses in the following envelope format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "errors": [ ... ] // Optional validation errors
  }
}
```

## Authentication

All API endpoints require authentication. See [Authentication Documentation](./authentication.md) for details.

- Admin endpoints require `x-admin-key` header
- Tenant endpoints accept either `x-admin-key` or `x-api-key` header
- Some endpoints support API key as query parameter: `?apiKey=YOUR_KEY`

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Window:** 60 seconds (configurable via `API_RATE_LIMIT_WINDOW_MS`)
- **Max Requests:** 120 per window (configurable via `API_RATE_LIMIT_MAX`)
- Rate limit headers are included in responses:
  - `RateLimit-Limit`: Maximum requests allowed
  - `RateLimit-Remaining`: Remaining requests in current window
  - `RateLimit-Reset`: Timestamp when the window resets

When rate limit is exceeded, the API returns `429 Too Many Requests`.

---

## Endpoints

### Chat

#### POST /api/chat

Send a message and receive an AI-powered response with optional RAG (Retrieval-Augmented Generation) and MCP tool support.

**Authentication:** Admin or Tenant API key

**Request Body:**
```json
{
  "tenantId": "string (required)",
  "message": "string (required, min length: 1)",
  "conversationId": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "AI response text",
    "conversationId": "conv_123",
    "metadata": {
      "model": "gpt-4o",
      "usage": {
        "promptTokens": 150,
        "completionTokens": 200,
        "totalTokens": 350
      },
      "ragEnabled": true,
      "contextUsed": true,
      "toolsUsed": false,
      "mcpEnabled": true,
      "confidenceEscalation": {
        "enabled": true,
        "escalated": false,
        "action": "respond",
        "confidenceScore": 0.85,
        "confidenceLevel": "high"
      }
    }
  }
}
```

**Features:**
- Automatic conversation creation if `conversationId` is not provided
- RAG integration for context-aware responses (if enabled for tenant)
- MCP tool calling support (if MCP servers are enabled)
- Confidence-based escalation to human agents
- Multi-language support based on tenant settings
- Conversation history context (last 20 messages)

**Example (curl):**
```bash
curl -X POST https://chat.genai.hr/api/chat \
  -H "x-api-key: ten_your_tenant_key" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_123",
    "message": "What are your office hours?",
    "conversationId": "conv_456"
  }'
```

**Example (JavaScript):**
```javascript
const response = await fetch('https://chat.genai.hr/api/chat', {
  method: 'POST',
  headers: {
    'x-api-key': 'ten_your_tenant_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tenantId: 'tenant_123',
    message: 'What are your office hours?',
    conversationId: 'conv_456'
  })
});

const data = await response.json();
console.log(data.data.message);
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Missing or invalid API key
- `403 Forbidden` - Tenant ID mismatch
- `404 Not Found` - Tenant not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

### Tenants

#### GET /api/tenants

List all tenants in the system.

**Authentication:** Admin only

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "tenant_123",
      "name": "Acme Corp",
      "enabled": true,
      "settings": {
        "llm": {
          "provider": "openai",
          "model": "gpt-4o",
          "temperature": 0.7,
          "maxTokens": 2000,
          "systemPrompt": "You are a helpful assistant..."
        },
        "enableRag": true,
        "ragConfig": {
          "topK": 5,
          "minSimilarity": 0.5
        },
        "enabledMcpServers": [],
        "language": "en"
      },
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

**Example:**
```bash
curl https://chat.genai.hr/api/tenants \
  -H "x-admin-key: adm_your_admin_key"
```

---

#### POST /api/tenants

Create a new tenant.

**Authentication:** Admin only

**Request Body:**
```json
{
  "name": "string (required)",
  "settings": {
    "llm": {
      "provider": "openai|deepseek|ollama",
      "model": "string",
      "apiKey": "string",
      "baseUrl": "string (optional)",
      "temperature": 0.7,
      "maxTokens": 2000,
      "systemPrompt": "string"
    },
    "enableRag": false,
    "language": "en|hr"
  },
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "tenant_new",
    "name": "New Tenant",
    "enabled": true,
    "settings": { ... },
    "createdAt": "2025-01-18T14:30:00.000Z",
    "updatedAt": "2025-01-18T14:30:00.000Z"
  }
}
```

**Example:**
```bash
curl -X POST https://chat.genai.hr/api/tenants \
  -H "x-admin-key: adm_your_admin_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Company",
    "enabled": true,
    "settings": {
      "llm": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "temperature": 0.7
      }
    }
  }'
```

---

#### GET /api/tenants/:tenantId

Get details of a specific tenant.

**Authentication:** Admin only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "tenant_123",
    "name": "Acme Corp",
    "enabled": true,
    "settings": { ... },
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Tenant not found

---

#### PUT /api/tenants/:tenantId

Update tenant configuration (full replacement).

**Authentication:** Admin only

**Request Body:** Same as POST, all fields optional

**Response:** Updated tenant object

---

#### PATCH /api/tenants/:tenantId

Partially update tenant configuration (merge).

**Authentication:** Admin only

**Request Body:** Same as PUT, all fields optional

**Response:** Updated tenant object

---

#### DELETE /api/tenants/:tenantId

Delete a tenant and all associated data (cascade delete).

**Authentication:** Admin only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "tenant_123",
    "deleted": true
  }
}
```

**Warning:** This operation permanently deletes all tenant data including conversations, messages, documents, and API keys.

---

### Documents

#### GET /api/documents

List documents for RAG system.

**Authentication:** Admin only

**Query Parameters:**
- `tenantId` (optional): Filter by tenant ID
- `status` (optional): Filter by status (pending|processing|completed|failed)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "doc_123",
      "tenantId": "tenant_123",
      "filename": "company_policies.txt",
      "mimeType": "text/plain",
      "size": 15420,
      "path": "documents/tenant_123/1705320000-company_policies.txt",
      "checksum": "sha256_hash",
      "storageProvider": "local",
      "status": "completed",
      "version": 1,
      "metadata": {
        "name": "Company Policies",
        "source": "upload",
        "chunksCount": 45
      },
      "createdAt": "2025-01-15T12:00:00.000Z",
      "updatedAt": "2025-01-15T12:05:00.000Z"
    }
  ]
}
```

**Example:**
```bash
curl "https://chat.genai.hr/api/documents?tenantId=tenant_123&status=completed" \
  -H "x-admin-key: adm_your_admin_key"
```

---

#### POST /api/documents

Create a new document for RAG processing.

**Authentication:** Admin only

**Request Body:**
```json
{
  "tenantId": "string (required)",
  "name": "string (required)",
  "source": "string (optional)",
  "metadata": {
    "content": "string (required - document text content)",
    "fileType": "string (optional)",
    "fileSize": 12345
  }
}
```

**Response:** Created document object with `status: "pending"`

**Note:** The document will be automatically processed for embedding generation and chunking. Check the `status` field to monitor progress.

**Example:**
```bash
curl -X POST https://chat.genai.hr/api/documents \
  -H "x-admin-key: adm_your_admin_key" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_123",
    "name": "FAQ Document",
    "source": "manual_upload",
    "metadata": {
      "content": "Q: What are your hours?\nA: We are open 9-5 Monday-Friday.",
      "fileType": "text/plain"
    }
  }'
```

---

#### GET /api/documents/:documentId

Get details of a specific document.

**Authentication:** Admin only

**Response:** Document object

---

#### PUT /api/documents/:documentId

Update document metadata (full replacement).

**Authentication:** Admin only

**Request Body:**
```json
{
  "name": "string (optional)",
  "source": "string (optional)",
  "status": "string (optional)",
  "metadata": {
    "content": "string (triggers reprocessing)"
  }
}
```

**Note:** Updating `content` in metadata will increment the version and trigger reprocessing.

---

#### PATCH /api/documents/:documentId

Partially update document metadata.

**Authentication:** Admin only

**Request Body:** Same as PUT

---

#### DELETE /api/documents/:documentId

Delete a document and all associated embeddings.

**Authentication:** Admin only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "doc_123",
    "deleted": true
  }
}
```

---

### Conversations

#### GET /api/conversations

List conversations.

**Authentication:** Admin only

**Query Parameters:**
- `tenantId` (optional): Filter by tenant
- `status` (optional): Filter by status (active|assigned_human|resolved|archived)
- `channelType` (optional): Filter by channel (whatsapp|messenger|webchat)
- `userId` (optional): Filter by user ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "conv_123",
      "tenantId": "tenant_123",
      "channelType": "webchat",
      "externalId": "web-1705320000",
      "userId": "user_456",
      "status": "active",
      "metadata": {
        "humanHandoffRequested": false
      },
      "lastMessageAt": "2025-01-18T15:30:00.000Z",
      "createdAt": "2025-01-18T15:00:00.000Z",
      "updatedAt": "2025-01-18T15:30:00.000Z"
    }
  ]
}
```

**Example:**
```bash
curl "https://chat.genai.hr/api/conversations?tenantId=tenant_123&status=active" \
  -H "x-admin-key: adm_your_admin_key"
```

---

#### POST /api/conversations

Create a new conversation.

**Authentication:** Admin only

**Request Body:**
```json
{
  "tenantId": "string (required)",
  "channelType": "whatsapp|messenger|webchat (required)",
  "externalId": "string (required)",
  "userId": "string (required)",
  "metadata": {}
}
```

**Response:** Created conversation object

---

#### GET /api/conversations/:conversationId

Get conversation details with messages.

**Authentication:** Admin only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "conv_123",
    "tenantId": "tenant_123",
    "channelType": "webchat",
    "externalId": "web-123",
    "userId": "user_456",
    "status": "active",
    "metadata": {},
    "messages": [
      {
        "id": "msg_1",
        "tenantId": "tenant_123",
        "conversationId": "conv_123",
        "direction": "inbound",
        "from": "user_456",
        "type": "text",
        "content": {
          "text": "Hello, I need help"
        },
        "metadata": {},
        "timestamp": "2025-01-18T15:00:00.000Z"
      },
      {
        "id": "msg_2",
        "direction": "outbound",
        "from": "assistant",
        "type": "text",
        "content": {
          "text": "Hello! How can I help you today?"
        },
        "metadata": {
          "model": "gpt-4o",
          "ragEnabled": true
        },
        "timestamp": "2025-01-18T15:00:05.000Z"
      }
    ],
    "lastMessageAt": "2025-01-18T15:00:05.000Z",
    "createdAt": "2025-01-18T15:00:00.000Z",
    "updatedAt": "2025-01-18T15:00:05.000Z"
  }
}
```

**Note:** Returns last 50 messages ordered by timestamp ascending.

---

#### PUT /api/conversations/:conversationId

Update conversation status or metadata.

**Authentication:** Admin only

**Request Body:**
```json
{
  "status": "active|assigned_human|resolved|archived (optional)",
  "metadata": {}
}
```

**Response:** Updated conversation object

---

### API Keys

#### GET /api/security/tenants/:tenantId/api-keys

List all API keys for a tenant.

**Authentication:** Super Admin only

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "key_123",
      "label": "Production Key",
      "prefix": "ten_abc",
      "lastFour": "xyz1",
      "active": true,
      "createdAt": "2025-01-15T10:00:00.000Z",
      "lastUsedAt": "2025-01-18T15:30:00.000Z",
      "rotatedAt": null
    }
  ]
}
```

**Note:** Actual API key values are never returned after creation.

---

#### POST /api/security/tenants/:tenantId/api-keys

Create a new tenant API key.

**Authentication:** Super Admin only

**Request Body:**
```json
{
  "label": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "key_new",
    "apiKey": "ten_abc123...xyz",
    "lastFour": "xyz",
    "prefix": "ten_abc"
  }
}
```

**Warning:** The full API key is only returned once at creation. Store it securely.

**Example:**
```bash
curl -X POST https://chat.genai.hr/api/security/tenants/tenant_123/api-keys \
  -H "x-admin-key: adm_your_admin_key" \
  -H "Content-Type: application/json" \
  -d '{"label": "Production Key"}'
```

---

#### POST /api/security/tenants/:tenantId/api-keys/:keyId/rotation

Initiate API key rotation (step 1).

**Authentication:** Super Admin only

**Response:**
```json
{
  "success": true,
  "data": {
    "rotationToken": "rot_token_here",
    "expiresAt": "2025-01-18T16:00:00.000Z"
  }
}
```

**Note:** The rotation token is valid for a limited time. Use it to confirm rotation.

---

#### POST /api/security/tenants/:tenantId/api-keys/:keyId/rotation/confirm

Complete API key rotation (step 2).

**Authentication:** Super Admin only

**Request Body:**
```json
{
  "token": "rot_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "apiKey": "ten_new_key_value",
    "lastFour": "new4",
    "prefix": "ten_new"
  }
}
```

**Warning:** The new API key is only returned once. Update your applications immediately.

---

#### DELETE /api/security/tenants/:tenantId/api-keys/:keyId

Deactivate a tenant API key (soft delete).

**Authentication:** Super Admin only

**Response:**
```json
{
  "success": true,
  "message": "API key deactivated"
}
```

**Note:** The key is marked as `active: false` and can no longer be used for authentication.

---

#### POST /api/security/admin/users/:adminId/api-keys

Create an admin API key.

**Authentication:** Admin (self) or Super Admin

**Request Body:**
```json
{
  "label": "string (optional)"
}
```

**Response:** Same as tenant key creation

---

#### POST /api/security/admin/users/:adminId/api-keys/:keyId/rotation

Initiate admin key rotation.

**Authentication:** Admin (self) or Super Admin

**Response:** Rotation token

---

#### POST /api/security/admin/users/:adminId/api-keys/:keyId/rotation/confirm

Complete admin key rotation.

**Authentication:** Admin (self) or Super Admin

**Request Body:**
```json
{
  "token": "rotation_token"
}
```

**Response:** New API key

---

### MCP Servers

MCP (Model Context Protocol) servers provide tool calling capabilities for AI agents.

#### GET /api/mcpServers

List all MCP server configurations.

**Authentication:** Admin only

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "mcp_123",
      "name": "Weather Server",
      "description": "Provides weather information",
      "command": "node",
      "args": ["/path/to/weather-server.js"],
      "requiredEnv": ["WEATHER_API_KEY"],
      "enabled": true,
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

---

#### GET /api/mcpServers/:serverId

Get details of a specific MCP server.

**Authentication:** Admin only

**Response:** MCP server object

---

#### POST /api/mcpServers

Create a new MCP server configuration.

**Authentication:** Admin only

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "command": "string (required)",
  "args": ["array of strings"],
  "requiredEnv": ["array of env var names"],
  "enabled": true
}
```

**Response:** Created MCP server object

---

#### PATCH /api/mcpServers/:serverId

Update MCP server configuration.

**Authentication:** Admin only

**Request Body:** Same as POST, all fields optional

**Response:** Updated MCP server object

---

#### DELETE /api/mcpServers/:serverId

Delete an MCP server configuration.

**Authentication:** Admin only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "mcp_123",
    "deleted": true
  }
}
```

---

### Channels

#### GET /api/channels

List channels for a tenant.

**Authentication:** Admin only

**Query Parameters:**
- `tenantId` (optional): Filter by tenant

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "chan_123",
      "tenantId": "tenant_123",
      "type": "whatsapp",
      "config": {
        "phoneNumberId": "123456789",
        "accessToken": "token_here",
        "webhookVerifyToken": "verify_token",
        "appSecret": "secret_here"
      },
      "enabled": true,
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

---

#### POST /api/channels

Create a new channel.

**Authentication:** Admin only

**Request Body:**
```json
{
  "tenantId": "string (required)",
  "type": "whatsapp|messenger|webchat (required)",
  "config": {
    // Channel-specific configuration
  },
  "enabled": true
}
```

**Response:** Created channel object

---

#### PATCH /api/channels/:channelId

Update channel configuration.

**Authentication:** Admin only

**Request Body:**
```json
{
  "type": "string (optional)",
  "config": {},
  "enabled": true
}
```

**Response:** Updated channel object

---

#### DELETE /api/channels/:channelId

Delete a channel.

**Authentication:** Admin only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "chan_123",
    "deleted": true
  }
}
```

---

### Webhooks

#### GET /api/webhooks

List webhook subscriptions.

**Authentication:** Admin only

**Query Parameters:**
- `tenantId` (optional): Filter by tenant

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "webhook_123",
      "tenantId": "tenant_123",
      "url": "https://example.com/webhook",
      "events": ["message.received", "conversation.resolved"],
      "headers": {
        "Authorization": "Bearer token"
      },
      "enabled": true,
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

---

#### POST /api/webhooks

Create a webhook subscription.

**Authentication:** Admin only

**Request Body:**
```json
{
  "tenantId": "string (required)",
  "url": "string (required, valid URL)",
  "events": ["array of event types (required, min 1)"],
  "headers": {
    "key": "value"
  },
  "enabled": true
}
```

**Available Events:**
- `message.received`
- `conversation.created`
- `conversation.resolved`
- `human_handoff.requested`

**Response:** Created webhook object

---

#### GET /api/webhooks/:webhookId

Get webhook details.

**Authentication:** Admin only

**Response:** Webhook object

---

#### PUT /api/webhooks/:webhookId

Update webhook configuration.

**Authentication:** Admin only

**Request Body:** Same as POST, all fields optional

**Response:** Updated webhook object

---

#### DELETE /api/webhooks/:webhookId

Delete a webhook subscription.

**Authentication:** Admin only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "webhook_123",
    "deleted": true
  }
}
```

---

### Ollama / LLM Models

#### GET /api/ollama/models

Fetch available models from an Ollama server.

**Authentication:** Admin only

**Query Parameters:**
- `baseUrl` (required): Ollama server base URL (e.g., `http://localhost:11434`)

**Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "name": "llama2:latest",
        "size": 3825819519,
        "modified": "2025-01-15T10:00:00.000Z",
        "details": {
          "format": "gguf",
          "family": "llama"
        }
      }
    ]
  }
}
```

**Example:**
```bash
curl "https://chat.genai.hr/api/ollama/models?baseUrl=http://localhost:11434" \
  -H "x-admin-key: adm_your_admin_key"
```

---

#### GET /api/ollama/openai-models

Fetch available models from OpenAI API.

**Authentication:** Admin only

**Query Parameters:**
- `apiKey` (optional): OpenAI API key. If not provided, returns default models.

**Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "gpt-4o",
        "name": "GPT-4o (Best, ~$2.50/1M tokens)",
        "created": 1705320000
      },
      {
        "id": "gpt-4o-mini",
        "name": "GPT-4o Mini (Fast, ~$0.15/1M tokens)",
        "created": 1705320000
      }
    ]
  }
}
```

---

### Webhook Integrations

These endpoints handle incoming webhooks from messaging platforms.

#### GET /api/integrations/whatsapp/:tenantId

WhatsApp webhook verification endpoint.

**Authentication:** None (webhook verification)

**Query Parameters:**
- `hub.mode`: Should be "subscribe"
- `hub.verify_token`: Token configured in channel settings
- `hub.challenge`: Challenge string to return

**Response:** Returns the challenge string on successful verification

---

#### POST /api/integrations/whatsapp/:tenantId

WhatsApp message webhook receiver.

**Authentication:** HMAC signature verification (x-hub-signature-256 header)

**Request Body:** WhatsApp webhook payload (see Meta documentation)

**Response:**
```json
{
  "success": true,
  "data": {}
}
```

**Note:** Messages are normalized and published to the message queue for processing.

---

#### GET /api/integrations/messenger/:tenantId

Messenger webhook verification endpoint.

**Authentication:** None (webhook verification)

**Query Parameters:** Same as WhatsApp

---

#### POST /api/integrations/messenger/:tenantId

Messenger message webhook receiver.

**Authentication:** HMAC signature verification

**Request Body:** Messenger webhook payload

**Response:** Success acknowledgment

---

### Health & Metrics

#### GET /health

Health check endpoint for monitoring.

**Authentication:** None

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-18T15:30:00.000Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "rabbitmq": "healthy"
  }
}
```

**Status Values:**
- `healthy` - All services operational
- `degraded` - Some services unavailable
- `unhealthy` - Critical services down

---

#### GET /metrics

Prometheus metrics endpoint.

**Authentication:** None (should be restricted at network level)

**Response:** Prometheus text format metrics

**Example Metrics:**
```
# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="POST",route="/api/chat",status="200",le="0.1"} 45
http_request_duration_seconds_bucket{method="POST",route="/api/chat",status="200",le="0.5"} 92
http_request_duration_seconds_sum{method="POST",route="/api/chat",status="200"} 28.4
http_request_duration_seconds_count{method="POST",route="/api/chat",status="200"} 100
```

---

## Error Handling

### Standard Error Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| 400 | Bad Request | Invalid JSON, validation errors, missing required fields |
| 401 | Unauthorized | Missing or invalid API key |
| 403 | Forbidden | Insufficient permissions, tenant ID mismatch |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error, database connection issues |

### Validation Errors

When validation fails (400 status), the response includes detailed error information:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "errors": [
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "number",
        "path": ["message"],
        "message": "Expected string, received number"
      }
    ]
  }
}
```

### Rate Limit Errors

```json
{
  "success": false,
  "error": {
    "message": "Too many requests, please try again later"
  }
}
```

Response headers include:
- `RateLimit-Limit`: 120
- `RateLimit-Remaining`: 0
- `RateLimit-Reset`: Unix timestamp

---

## Related Documentation

- [Authentication & Security](./authentication.md)
- [Confidence Escalation Guide](../../confidence-based-escalation-guide.md)
- [MCP Integration Guide](../../MCP-INTEGRATION-GUIDE.md)
- [Architecture Overview](../architecture/system-architecture.md)
- [LLM Providers](../../LLM-PROVIDERS.md)

---

## Change Log

### 2025-11-18
- Initial comprehensive API documentation
- Documented all REST endpoints
- Added code examples for major endpoints
- Documented error handling and rate limiting
