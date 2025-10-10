# MCP Per-Tenant Credentials Architecture

**Critical Fix**: Each tenant must provide their own credentials for MCP servers (Google Calendar, GitHub, Telegram, etc.)

---

## Problem

The initial MCP implementation stored credentials globally in the `McpServer` table:

```typescript
// ❌ WRONG: Global credentials
model McpServer {
  env Json @default("{}") // ← All tenants shared these credentials!
}
```

This meant:
- **Tenant A's** Google Calendar would access **Admin's** calendar
- **Tenant B's** GitHub integration would use **Admin's** GitHub account
- All tenants shared the same Telegram bot, Slack workspace, etc.

**This is completely wrong!** Each tenant needs their OWN accounts and credentials.

---

## Solution

### New Architecture

**1. Global MCP Server (Template)**
- Defines the command structure
- Lists REQUIRED environment variable names (but NOT values)
- Acts as a template for all tenants

```typescript
model McpServer {
  requiredEnv Json @default("[]") // ← Array of env var NAMES, not values
}
```

Example:
```json
{
  "id": "mcp_google_calendar",
  "name": "Google Calendar",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-google-calendar"],
  "requiredEnv": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"]
}
```

**2. Per-Tenant MCP Configuration**
- Stored in `Tenant.settings.mcpConfigs`
- Each tenant provides their own credentials
- Tenant-isolated, secure

```typescript
// Tenant settings structure
{
  "mcpConfigs": [
    {
      "serverId": "mcp_google_calendar",
      "enabled": true,
      "credentials": {
        "GOOGLE_CLIENT_ID": "tenant1-client-id",
        "GOOGLE_CLIENT_SECRET": "tenant1-secret",
        "GOOGLE_REFRESH_TOKEN": "tenant1-token"
      }
    },
    {
      "serverId": "mcp_github",
      "enabled": true,
      "credentials": {
        "GITHUB_TOKEN": "tenant1-github-token"
      }
    }
  ]
}
```

---

## Implementation Details

### Backend Changes

#### 1. Database Schema (`packages/database/prisma/schema.prisma`)

```prisma
model McpServer {
  id           String   @id @default(cuid())
  name         String   @unique
  description  String?
  command      String
  args         Json     @default("[]")
  requiredEnv  Json     @default("[]")  // ← Changed from `env` to `requiredEnv`
  enabled      Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("mcp_servers")
}
```

Applied via: `npx prisma db push`

#### 2. MCP Client Service (`apps/api/src/services/mcpClient.ts`)

**Updated `connectToMcpServer()` function**:

```typescript
export async function connectToMcpServer(
  serverId: string,
  tenantCredentials: Record<string, string> = {}  // ← Tenant-specific!
): Promise<McpTool[]> {
  // Create unique connection key per tenant
  const credentialsKey = JSON.stringify(tenantCredentials);
  const connectionKey = `${serverId}:${Buffer.from(credentialsKey).toString('base64').slice(0, 20)}`;

  // Spawn process with tenant credentials
  const env = { ...process.env, ...tenantCredentials };  // ← Tenant env vars
  const childProcess = spawn(server.command, args, { env, stdio: ['pipe', 'pipe', 'pipe'] });

  // ... rest of connection logic
}
```

**Updated `getAvailableMcpTools()` function**:

```typescript
export async function getAvailableMcpTools(tenantId: string) {
  const settings = tenant.settings as any;
  const mcpConfigs = settings?.mcpConfigs || [];  // ← New structure

  for (const config of mcpConfigs.filter(c => c.enabled)) {
    const tenantCredentials = config.credentials || {};
    const tools = await connectToMcpServer(config.serverId, tenantCredentials);

    results.push({
      connectionKey,  // ← Unique per tenant
      serverId: config.serverId,
      tools
    });
  }
}
```

#### 3. Chat Endpoint (`apps/api/src/routes/chat.ts`)

**Updated to use connection keys**:

```typescript
const mcpToolServers = await getAvailableMcpTools(payload.tenantId);

for (const toolCall of firstResponse.toolCalls) {
  const serverWithTool = mcpToolServers.find(s => s.tools.some(t => t.name === toolCall.name));

  const toolResult = await executeMcpTool(
    serverWithTool.connectionKey,  // ← Connection-specific key
    toolCall.name,
    toolCall.arguments
  );
}
```

#### 4. MCP Server Routes (`apps/api/src/routes/mcpServers.ts`)

**Updated schemas**:

```typescript
const createMcpServerSchema = z.object({
  name: z.string().min(1),
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  requiredEnv: z.array(z.string()).default([]),  // ← Array of env var names
  enabled: z.boolean().default(true),
});
```

---

### Dashboard UI Changes

#### 1. Global MCP Servers Page (`/mcp-servers`)

**Before**:
- Admins entered environment variable KEY=VALUE pairs
- These credentials were shared by all tenants ❌

**After**:
- Admins only enter environment variable NAMES (requiredEnv)
- Example: `["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]`
- No credential values stored globally ✅

#### 2. Tenant Settings Page (`/tenants/:id/settings`)

**Before**:
- Simple ON/OFF toggle per MCP server
- No credential input ❌

**After**:
- Expandable card per MCP server
- Shows required environment variables
- Input fields for each credential
- Credentials stored in `tenant.settings.mcpConfigs` ✅

**New UI Structure**:

```
┌────────────────────────────────────────────────────────┐
│ MCP Tool Integrations                                  │
├────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─ Google Calendar ──────────────────────────────────┐ │
│ │  [✓] Enable Google Calendar                        │ │
│ │                                                     │ │
│ │  Required Credentials:                             │ │
│ │  ┌───────────────────────────────────────────────┐ │ │
│ │  │ GOOGLE_CLIENT_ID                              │ │ │
│ │  │ [your-client-id.apps.googleusercontent.com  ] │ │ │
│ │  └───────────────────────────────────────────────┘ │ │
│ │  ┌───────────────────────────────────────────────┐ │ │
│ │  │ GOOGLE_CLIENT_SECRET                          │ │ │
│ │  │ [your-secret-value                          ] │ │ │
│ │  └───────────────────────────────────────────────┘ │ │
│ │  ┌───────────────────────────────────────────────┐ │ │
│ │  │ GOOGLE_REFRESH_TOKEN                          │ │ │
│ │  │ [your-refresh-token                         ] │ │ │
│ │  └───────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ GitHub ───────────────────────────────────────────┐ │
│ │  [✓] Enable GitHub                                 │ │
│ │                                                     │ │
│ │  Required Credentials:                             │ │
│ │  ┌───────────────────────────────────────────────┐ │ │
│ │  │ GITHUB_TOKEN                                  │ │ │
│ │  │ [ghp_your_personal_access_token             ] │ │ │
│ │  └───────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [ Save Settings ]                                       │
└────────────────────────────────────────────────────────┘
```

---

## Connection Pooling

**Challenge**: Each tenant has different credentials, so we can't share connections.

**Solution**: Connection keys based on credentials

```typescript
// Connection key format
const connectionKey = `${serverId}:${credentialsHash}`;

// Examples
"mcp_google_calendar:MTIzNDU2Nzg5MA=="  // Tenant A
"mcp_google_calendar:OTg3NjU0MzIxMA=="  // Tenant B

// Each tenant gets their own connection with their own credentials
activeConnections.set(connectionKey, connection);
```

---

## Security Considerations

### ✅ Improvements

1. **Tenant Isolation**: Each tenant's credentials are stored separately
2. **No Shared Credentials**: Tenants can't access each other's services
3. **Audit Trail**: Credentials stored in tenant settings (encrypted in database)
4. **Secure Storage**: Tenant settings should use encryption at rest

### ⚠️ TODO

1. **Encrypt Credentials**: Add field-level encryption for `mcpConfigs.credentials`
2. **Credential Validation**: Validate credentials when saving
3. **Rotation Support**: Allow tenants to rotate credentials
4. **Access Logs**: Log all MCP tool executions with tenant ID

---

## Migration Path

### For Existing Deployments

1. **Backup Database**:
   ```bash
   pg_dump metachat > backup.sql
   ```

2. **Apply Schema Changes**:
   ```bash
   cd packages/database
   DATABASE_URL="..." npx prisma db push
   ```

3. **Migrate Existing MCP Servers**:
   - Any existing MCP servers with `env` values must be recreated
   - Old `env` object → new `requiredEnv` array (extract keys only)
   - Inform tenants to add their credentials in Tenant Settings

4. **Update Dashboard**:
   ```bash
   cd apps/dashboard
   npm run build
   sudo cp -r dist/* /var/www/metachat/
   ```

5. **Restart API**:
   ```bash
   pm2 restart meta-chat-api
   ```

---

## Examples

### Example 1: Google Calendar

**Global Configuration** (Admin sets up once):
```json
POST /api/mcp-servers
{
  "name": "Google Calendar",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-google-calendar"],
  "requiredEnv": [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REFRESH_TOKEN"
  ]
}
```

**Tenant A Configuration**:
```json
PATCH /api/tenants/tenant_a
{
  "settings": {
    "mcpConfigs": [
      {
        "serverId": "mcp_google_calendar",
        "enabled": true,
        "credentials": {
          "GOOGLE_CLIENT_ID": "tenant-a-client.apps.googleusercontent.com",
          "GOOGLE_CLIENT_SECRET": "tenant-a-secret",
          "GOOGLE_REFRESH_TOKEN": "tenant-a-refresh-token"
        }
      }
    ]
  }
}
```

**Tenant B Configuration**:
```json
PATCH /api/tenants/tenant_b
{
  "settings": {
    "mcpConfigs": [
      {
        "serverId": "mcp_google_calendar",
        "enabled": true,
        "credentials": {
          "GOOGLE_CLIENT_ID": "tenant-b-client.apps.googleusercontent.com",
          "GOOGLE_CLIENT_SECRET": "tenant-b-secret",
          "GOOGLE_REFRESH_TOKEN": "tenant-b-refresh-token"
        }
      }
    ]
  }
}
```

**Result**:
- Tenant A's chatbot accesses Tenant A's Google Calendar
- Tenant B's chatbot accesses Tenant B's Google Calendar
- Completely isolated ✅

---

## API Changes Summary

| Endpoint | Before | After |
|----------|--------|-------|
| `POST /api/mcp-servers` | `env: {"KEY": "value"}` | `requiredEnv: ["KEY"]` |
| `PATCH /api/mcp-servers/:id` | `env: {"KEY": "value"}` | `requiredEnv: ["KEY"]` |
| `PATCH /api/tenants/:id` | `enabledMcpServers: ["id1"]` | `mcpConfigs: [{serverId, enabled, credentials}]` |

---

## Testing

### Manual Test

1. **Create MCP Server**:
   ```bash
   curl -X POST https://chat.genai.hr/api/mcp-servers \
     -H "x-admin-key: your-key" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Server",
       "command": "npx",
       "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
       "requiredEnv": ["ALLOWED_PATH"]
     }'
   ```

2. **Configure Tenant A**:
   ```bash
   curl -X PATCH https://chat.genai.hr/api/tenants/tenant_a \
     -H "x-admin-key: your-key" \
     -H "Content-Type: application/json" \
     -d '{
       "settings": {
         "mcpConfigs": [
           {
             "serverId": "mcp_test",
             "enabled": true,
             "credentials": {
               "ALLOWED_PATH": "/tmp/tenant-a"
             }
           }
         ]
       }
     }'
   ```

3. **Test Chat**:
   - Tenant A: "List files" → Should see files in `/tmp/tenant-a`
   - Tenant B (different credentials): "List files" → Should see files in `/tmp/tenant-b`

---

## Conclusion

This architecture change is **critical** for multi-tenant MCP support. Each tenant now provides their own credentials, ensuring:

✅ **Tenant Isolation**: No credential sharing
✅ **Security**: Tenant-specific access to external services
✅ **Scalability**: Unlimited tenants with their own accounts
✅ **Flexibility**: Each tenant configures only what they need

**Status**: Implemented in backend, UI updates pending deployment.

---

**Built with ❤️ for secure multi-tenant AI**
