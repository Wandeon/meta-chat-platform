# API Authentication & Security

**Last Updated:** 2025-11-18
**Status:** ✅ Current
**Maintainer:** API Team

## Overview

The Meta Chat Platform API uses API key-based authentication to secure all endpoints. There are two types of API keys:

1. **Admin API Keys** - Full access to all platform resources
2. **Tenant API Keys** - Scoped access to specific tenant resources

All API keys use cryptographic hashing (bcrypt) with salts for secure storage. Keys are prefixed to identify their type and facilitate quick lookups.

---

## API Key Types

### Admin API Keys

**Prefix:** `adm_`

**Format:** `adm_[random_base58_characters]`

**Access Level:** Full administrative access

**Capabilities:**
- Manage tenants (create, read, update, delete)
- Manage all conversations and messages
- Access all documents across tenants
- Create and manage API keys
- Configure channels and webhooks
- View all system resources

**Authentication Header:** `x-admin-key`

**Example:**
```bash
curl https://chat.genai.hr/api/tenants \
  -H "x-admin-key: adm_abc123xyz..."
```

### Tenant API Keys

**Prefix:** `ten_`

**Format:** `ten_[random_base58_characters]`

**Access Level:** Scoped to specific tenant

**Capabilities:**
- Send chat messages for the tenant
- Access own tenant's conversations
- Limited to tenant's own resources
- Cannot access other tenants' data
- Cannot perform administrative operations

**Authentication Header:** `x-api-key`

**Alternative:** Can be passed as query parameter `?apiKey=ten_...`

**Example:**
```bash
curl -X POST https://chat.genai.hr/api/chat \
  -H "x-api-key: ten_abc123xyz..." \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "tenant_123", "message": "Hello"}'
```

---

## Authentication Methods

### Header-Based Authentication

**Recommended method** for all API calls.

**Admin Endpoints:**
```http
GET /api/tenants HTTP/1.1
Host: chat.genai.hr
x-admin-key: adm_your_admin_key_here
```

**Tenant Endpoints:**
```http
POST /api/chat HTTP/1.1
Host: chat.genai.hr
x-api-key: ten_your_tenant_key_here
Content-Type: application/json

{"tenantId": "tenant_123", "message": "Hello"}
```

**Dual Authentication Endpoints:**

Some endpoints accept either admin or tenant keys. The API will try admin authentication first, then fall back to tenant authentication:

```http
POST /api/chat HTTP/1.1
Host: chat.genai.hr
x-api-key: ten_your_tenant_key_here  # or x-admin-key
Content-Type: application/json
```

### Query Parameter Authentication

**Use case:** When headers cannot be easily set (e.g., browser GET requests, simple integrations)

**Format:**
```
GET https://chat.genai.hr/api/chat?apiKey=ten_your_key
```

**Security Note:** Query parameters may be logged in server logs and browser history. Use header-based authentication for production systems.

---

## API Key Management

### Creating API Keys

#### Admin Keys

Only super admins can create admin keys.

**Endpoint:** `POST /api/security/admin/users/:adminId/api-keys`

**Request:**
```bash
curl -X POST https://chat.genai.hr/api/security/admin/users/admin_123/api-keys \
  -H "x-admin-key: adm_super_admin_key" \
  -H "Content-Type: application/json" \
  -d '{"label": "Production Admin Key"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "key_abc123",
    "apiKey": "adm_full_key_returned_once_only",
    "lastFour": "xyz1",
    "prefix": "adm_abc"
  }
}
```

**Important:** The full API key is only returned once at creation. Store it securely immediately.

#### Tenant Keys

Super admins can create tenant keys.

**Endpoint:** `POST /api/security/tenants/:tenantId/api-keys`

**Request:**
```bash
curl -X POST https://chat.genai.hr/api/security/tenants/tenant_123/api-keys \
  -H "x-admin-key: adm_super_admin_key" \
  -H "Content-Type: application/json" \
  -d '{"label": "Production Key"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "key_def456",
    "apiKey": "ten_full_key_returned_once_only",
    "lastFour": "abc2",
    "prefix": "ten_def"
  }
}
```

### Listing API Keys

List keys to view metadata (without revealing the actual key values).

**Admin Keys:**
```bash
curl https://chat.genai.hr/api/security/admin/users/admin_123/api-keys \
  -H "x-admin-key: adm_your_key"
```

**Tenant Keys:**
```bash
curl https://chat.genai.hr/api/security/tenants/tenant_123/api-keys \
  -H "x-admin-key: adm_your_key"
```

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

### Rotating API Keys

API key rotation is a two-step process for security:

1. **Initiate Rotation** - Get a rotation token
2. **Confirm Rotation** - Complete the rotation with the token

**Step 1: Initiate Rotation**

```bash
curl -X POST https://chat.genai.hr/api/security/tenants/tenant_123/api-keys/key_123/rotation \
  -H "x-admin-key: adm_your_key"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rotationToken": "rot_secure_token_here",
    "expiresAt": "2025-01-18T16:00:00.000Z"
  }
}
```

**Step 2: Confirm Rotation**

```bash
curl -X POST https://chat.genai.hr/api/security/tenants/tenant_123/api-keys/key_123/rotation/confirm \
  -H "x-admin-key: adm_your_key" \
  -H "Content-Type: application/json" \
  -d '{"token": "rot_secure_token_here"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "apiKey": "ten_brand_new_key_value",
    "lastFour": "new4",
    "prefix": "ten_new"
  }
}
```

**Important:**
- The new key is only shown once
- Update your applications immediately
- The rotation token expires (check `expiresAt`)
- Old key becomes invalid after confirmation

### Deactivating API Keys

Soft delete (mark as inactive) to prevent further use without permanent deletion.

**Endpoint:** `DELETE /api/security/tenants/:tenantId/api-keys/:keyId`

```bash
curl -X DELETE https://chat.genai.hr/api/security/tenants/tenant_123/api-keys/key_123 \
  -H "x-admin-key: adm_your_key"
```

**Response:**
```json
{
  "success": true,
  "message": "API key deactivated"
}
```

After deactivation:
- Key cannot be used for authentication
- Key metadata remains in database
- `active` field is set to `false`
- `lastUsedAt` is preserved for audit trails

---

## Security Implementation

### Key Generation

**Algorithm:** Random base58-encoded strings

**Key Components:**
- **Prefix:** Type identifier (`adm_` or `ten_`)
- **Random Data:** Cryptographically secure random bytes
- **Encoding:** Base58 (Bitcoin alphabet, no ambiguous characters)
- **Total Length:** Approximately 40-50 characters

**Example Key Structure:**
```
ten_5KHxQ8NfGJYN2vP7wR9mX3tA1bC4dE2fG
│   └─────────────────────────────────────┘
│                    │
└─ Prefix            └─ Random base58 string
```

### Key Storage

Keys are never stored in plain text:

**Storage Process:**
1. Generate API key with prefix
2. Derive prefix and last 4 characters for quick lookup
3. Generate random salt (16 bytes)
4. Hash key with bcrypt using salt
5. Store: `prefix`, `hash`, `salt`, `lastFour`
6. Return full key to client (only once)

**Database Schema:**
```sql
CREATE TABLE tenant_api_keys (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  label TEXT,
  prefix TEXT NOT NULL,      -- e.g., "ten_abc"
  hash TEXT NOT NULL,         -- bcrypt hash
  salt TEXT NOT NULL,         -- hex-encoded salt
  last_four TEXT NOT NULL,    -- e.g., "xyz1"
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  last_used_at TIMESTAMP,
  rotated_at TIMESTAMP,
  expires_at TIMESTAMP,
  -- Rotation fields
  rotation_token_hash TEXT,
  rotation_token_salt TEXT,
  rotation_issued_at TIMESTAMP,
  rotation_expires_at TIMESTAMP
);
```

### Key Verification

**Authentication Process:**

1. **Extract API Key:** From `x-api-key`, `x-admin-key` header, or `apiKey` query param
2. **Derive Prefix:** Extract prefix from key (e.g., `ten_abc`)
3. **Database Lookup:** Find key by prefix where `active = true`
4. **Hash Verification:** Verify key against stored hash using bcrypt
5. **Expiration Check:** Verify `expires_at` (if set) is in the future
6. **Update Last Used:** Record `last_used_at` timestamp
7. **Grant Access:** Attach tenant/admin context to request

**Timing-Safe Comparison:**

All hash comparisons use `timingSafeEqual()` to prevent timing attacks:

```typescript
import { timingSafeEqual } from 'crypto';

const isValid = await verifySecret(apiKey, storedHash, storedSalt);
```

### Request Context

After successful authentication, the API attaches context to the request:

**Tenant Authentication:**
```typescript
req.tenant = {
  id: "tenant_123",
  apiKeyId: "key_abc"
};
```

**Admin Authentication:**
```typescript
req.adminUser = {
  id: "admin_123",
  role: "SUPER"  // or "ADMIN"
};
```

**Correlation Tracking:**

Every request gets unique identifiers:

```typescript
{
  requestId: "req_abc123",      // Unique per request
  correlationId: "corr_def456", // For distributed tracing
  tenantId: "tenant_123"        // If authenticated
}
```

---

## Authorization Levels

### Super Admin

**Role:** `SUPER`

**Capabilities:**
- All admin capabilities
- Manage other admins
- Create/delete tenant API keys
- Access cross-tenant analytics

**Restrictions:**
- Cannot be demoted by regular admins
- Can only be created by other super admins

### Regular Admin

**Role:** `ADMIN`

**Capabilities:**
- Manage own API keys
- Perform administrative operations
- Access all tenant data

**Restrictions:**
- Cannot create super admins
- Cannot manage other admins' keys

### Tenant

**Role:** (none - identified by tenant API key)

**Capabilities:**
- Send chat messages for own tenant
- Access own conversations
- View own documents

**Restrictions:**
- Cannot access other tenants' data
- Cannot perform admin operations
- Tenant ID in request must match authenticated tenant

**Tenant ID Validation:**

```typescript
// Example from /api/chat endpoint
if (req.tenant && !req.adminUser && req.tenant.id !== payload.tenantId) {
  throw createHttpError(403, 'Tenant ID mismatch: you can only access your own tenant');
}
```

---

## Webhook Authentication

Webhooks from messaging platforms use HMAC signature verification instead of API keys.

### WhatsApp

**Signature Header:** `x-hub-signature-256`

**Format:** `sha256=<hex_signature>`

**Secret Source:** 
1. Channel config: `config.appSecret`
2. Channel config: `config.webhookSecret`
3. Environment: `WHATSAPP_VERIFY_TOKEN`

**Verification Process:**
```typescript
const signature = req.get('x-hub-signature-256').replace(/^sha256=/, '');
const expected = createHmac('sha256', secret)
  .update(rawBody)
  .digest('hex');

const isValid = timingSafeEqual(
  Buffer.from(expected, 'hex'),
  Buffer.from(signature, 'hex')
);
```

**Important:** Verification requires the raw request body (before JSON parsing).

### Messenger

**Signature Header:** `x-hub-signature` or `x-hub-signature-256`

**Format:** `sha1=<hex_signature>` or `sha256=<hex_signature>`

**Secret Source:**
1. Channel config: `config.appSecret`
2. Environment: `MESSENGER_VERIFY_TOKEN`

**Verification:** Same HMAC process as WhatsApp

### Webhook Verification Handshake

Both platforms require an initial GET request verification:

**Request:**
```
GET /api/integrations/whatsapp/tenant_123?hub.mode=subscribe&hub.verify_token=SECRET&hub.challenge=CHALLENGE
```

**Verification:**
1. Check `hub.mode === "subscribe"`
2. Verify `hub.verify_token` matches configured secret
3. Return `hub.challenge` as plain text response

**Response:**
```
CHALLENGE
```

---

## Best Practices

### Key Management

1. **Rotate Regularly**
   - Rotate production keys every 90 days
   - Rotate immediately if compromise suspected
   - Use rotation process to avoid downtime

2. **Principle of Least Privilege**
   - Use tenant keys for application integrations
   - Reserve admin keys for administrative tools
   - Create separate keys for different environments

3. **Secure Storage**
   - Never commit keys to version control
   - Use environment variables or secret managers
   - Encrypt keys at rest in your applications

4. **Labeling**
   - Use descriptive labels: "Production Web App", "Staging API"
   - Include creation date in label
   - Document key ownership

5. **Monitoring**
   - Track `lastUsedAt` for unused keys
   - Set up alerts for key expiration
   - Monitor for unauthorized access attempts

### Request Security

1. **HTTPS Only**
   - Always use HTTPS in production
   - API rejects HTTP in production mode
   - Certificate pinning recommended

2. **Headers Over Query Params**
   - Use `x-api-key` header, not `?apiKey=`
   - Query params may be logged
   - Headers are more secure

3. **Rate Limiting**
   - Respect rate limits (120 req/min default)
   - Implement exponential backoff
   - Cache responses when possible

4. **Request Validation**
   - Validate tenant IDs match your key
   - Check response success before processing
   - Handle errors gracefully

### Error Handling

1. **Don't Expose Secrets**
   ```javascript
   // BAD
   console.error(`Auth failed with key: ${apiKey}`);
   
   // GOOD
   console.error(`Auth failed with key ending in: ${apiKey.slice(-4)}`);
   ```

2. **Generic Error Messages**
   - Don't reveal whether key exists
   - Use generic "Invalid API key" message
   - Log details server-side only

3. **Retry Logic**
   ```javascript
   // Retry on 5xx errors, not 4xx
   if (response.status >= 500) {
     // Retry with backoff
   } else if (response.status === 401) {
     // Don't retry, key is invalid
   }
   ```

---

## Code Examples

### Node.js / JavaScript

**Setup:**
```javascript
const API_BASE = 'https://chat.genai.hr/api';
const API_KEY = process.env.TENANT_API_KEY;

async function sendChatMessage(tenantId, message, conversationId) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tenantId,
      message,
      conversationId
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }

  const data = await response.json();
  return data.data;
}

// Usage
const result = await sendChatMessage(
  'tenant_123',
  'What are your hours?',
  'conv_456'
);

console.log('AI Response:', result.message);
console.log('Conversation ID:', result.conversationId);
```

### Python

```python
import os
import requests

API_BASE = 'https://chat.genai.hr/api'
API_KEY = os.getenv('TENANT_API_KEY')

def send_chat_message(tenant_id, message, conversation_id=None):
    url = f'{API_BASE}/chat'
    headers = {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
    }
    payload = {
        'tenantId': tenant_id,
        'message': message
    }
    if conversation_id:
        payload['conversationId'] = conversation_id

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    
    data = response.json()
    return data['data']

# Usage
result = send_chat_message(
    'tenant_123',
    'What are your hours?',
    'conv_456'
)

print('AI Response:', result['message'])
print('Conversation ID:', result['conversationId'])
```

### cURL

**Chat Request:**
```bash
#!/bin/bash
TENANT_ID="tenant_123"
API_KEY="ten_your_key_here"

curl -X POST https://chat.genai.hr/api/chat \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"message\": \"What are your hours?\",
    \"conversationId\": \"conv_456\"
  }"
```

**List Conversations:**
```bash
curl "https://chat.genai.hr/api/conversations?tenantId=tenant_123&status=active" \
  -H "x-admin-key: adm_your_admin_key"
```

**Create Tenant:**
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
      },
      "language": "en"
    }
  }'
```

---

## Troubleshooting

### Common Authentication Errors

#### 401 Unauthorized - Missing API Key
```json
{
  "success": false,
  "error": {
    "message": "Missing API key"
  }
}
```

**Solution:** Include `x-api-key` or `x-admin-key` header in request.

#### 401 Unauthorized - Invalid API Key
```json
{
  "success": false,
  "error": {
    "message": "Invalid API key"
  }
}
```

**Causes:**
- Key is incorrect
- Key has been rotated
- Key is deactivated (`active: false`)
- Key has expired

**Solutions:**
- Verify key is correct (check last 4 digits)
- Check if key was recently rotated
- List keys to verify status
- Generate new key if needed

#### 403 Forbidden - Tenant ID Mismatch
```json
{
  "success": false,
  "error": {
    "message": "Tenant ID mismatch: you can only access your own tenant"
  }
}
```

**Cause:** Tenant API key used with wrong tenant ID in request body.

**Solution:** Ensure `tenantId` in request matches the tenant owning the API key.

#### 403 Forbidden - Insufficient Permissions
```json
{
  "success": false,
  "error": {
    "message": "Super admin privileges required"
  }
}
```

**Cause:** Regular admin key used for super-admin-only endpoint.

**Solution:** Use a super admin API key.

### Webhook Signature Verification Failures

**Error:**
```json
{
  "success": false,
  "error": {
    "message": "Invalid webhook signature"
  }
}
```

**Debugging Steps:**

1. **Check Secret Configuration:**
   - Verify `config.appSecret` in channel settings
   - Ensure it matches the secret in platform settings

2. **Verify Raw Body:**
   - Signature is computed on raw body bytes
   - Ensure no JSON parsing before verification
   - Check for character encoding issues

3. **Check Header Name:**
   - WhatsApp: `x-hub-signature-256`
   - Messenger: `x-hub-signature` or `x-hub-signature-256`

4. **Test Signature Manually:**
   ```bash
   echo -n 'payload' | openssl dgst -sha256 -hmac 'secret'
   ```

---

## Related Documentation

- [API Endpoints Reference](./endpoints.md)
- [Tenant Management Guide](../features/tenant-management.md)
- [Channel Configuration](../../CHANNELS.md)
- [Security Best Practices](../architecture/security.md)

---

## Change Log

### 2025-11-18
- Initial comprehensive authentication documentation
- Documented API key types and formats
- Added key management procedures
- Included webhook authentication details
- Added code examples for multiple languages
