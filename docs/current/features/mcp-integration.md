# MCP Integration

**Last Updated:** 2025-11-18
**Status:** ✅ Current
**Maintainer:** Integration Team

## Overview

The Meta Chat Platform integrates the **Model Context Protocol (MCP)** to extend AI chatbot capabilities with external tools and data sources. MCP is Anthropic's open standard that enables AI assistants to connect to services like Google Calendar, GitHub, file systems, databases, and custom integrations.

### What is MCP?

Model Context Protocol (MCP) provides:

- **Standardized Communication**: JSON-RPC 2.0 over stdio for tool discovery and execution
- **Tool Discovery**: Dynamic tool listing from MCP servers
- **Secure Execution**: Sandboxed tool execution with proper error handling
- **Extensibility**: Connect any tool that implements the MCP protocol

### Key Benefits

- **Pre-built Integrations**: Official MCP servers for Google Calendar, GitHub, Slack, etc.
- **Custom Tools**: Build your own MCP servers for proprietary integrations
- **Multi-Provider Support**: Works with OpenAI, DeepSeek, and Ollama (with function calling)
- **Tenant Isolation**: Per-tenant credentials ensure secure, isolated access to external services

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Dashboard                         │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │ Global MCP       │    │ Tenant Settings              │  │
│  │ Servers          │───▶│ - Enable/Disable MCP Servers │  │
│  │ - Add/Edit/Delete│    │ - Provide Credentials        │  │
│  └──────────────────┘    └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         API Server                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Chat Endpoint (/api/chat)                            │  │
│  │  1. Check enabled MCP servers for tenant             │  │
│  │  2. Discover tools from MCP servers                  │  │
│  │  3. Smart routing based on provider & tools          │  │
│  │  4. Execute function calls via MCP client            │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
│                              ▼                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ MCP Client Service (mcpClient.ts)                    │  │
│  │  - Spawn MCP server processes (child_process)        │  │
│  │  - JSON-RPC 2.0 communication over stdio            │  │
│  │  - Tool discovery: tools/list                        │  │
│  │  - Tool execution: tools/call                        │  │
│  │  - Connection pooling & lifecycle management         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server Processes                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Google      │  │ GitHub      │  │ Custom MCP Server   │ │
│  │ Calendar    │  │ Integration │  │ (Your Tool)         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### MCP Protocol Flow

1. **Connection Initialization**:
   - Platform spawns MCP server process with tenant-specific credentials
   - Sends `initialize` request via JSON-RPC 2.0
   - MCP server responds with capabilities and server info

2. **Tool Discovery**:
   - Platform sends `tools/list` request
   - MCP server returns available tools with schemas
   - Tools are cached per connection

3. **Chat Request with Tools**:
   - User sends message to chatbot
   - LLM receives message + available tools
   - LLM decides if tools are needed

4. **Tool Execution**:
   - LLM returns tool calls with arguments
   - Platform sends `tools/call` request to MCP server
   - MCP server executes tool and returns result

5. **Final Response**:
   - Tool results are added to conversation
   - LLM generates final response with tool context
   - Response sent to user

---

## Deployment & Setup

### Global MCP Server Configuration

MCP servers are configured globally by admins and then enabled per tenant with tenant-specific credentials.

#### Database Schema

```prisma
model McpServer {
  id           String   @id @default(cuid())
  name         String   @unique
  description  String?
  command      String   // e.g., "npx", "node", "python"
  args         Json     @default("[]") // Command arguments as array
  requiredEnv  Json     @default("[]") // Required env var names (array of strings)
  enabled      Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("mcp_servers")
}
```

#### Creating an MCP Server

**Example: Google Calendar**

```http
POST /api/mcp-servers
Content-Type: application/json
x-admin-key: your-admin-key

{
  "name": "Google Calendar",
  "description": "Manage Google Calendar events",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-google-calendar"],
  "requiredEnv": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"],
  "enabled": true
}
```

**Key Points**:
- `command`: Executable command (npx, node, python, etc.)
- `args`: Array of command arguments
- `requiredEnv`: List of environment variable NAMES (not values!)
- `enabled`: Controls global availability

### Per-Tenant Configuration

Each tenant provides their own credentials for MCP servers in their settings.

#### Tenant Settings Structure

```typescript
interface TenantSettings {
  mcpConfigs?: Array<{
    serverId: string;        // Global MCP server ID
    enabled: boolean;        // Enable/disable for this tenant
    credentials: {           // Tenant-specific credentials
      [key: string]: string; // Environment variable key-value pairs
    };
  }>;
  // ... other settings
}
```

#### Example Configuration

```http
PATCH /api/tenants/tenant_abc123
Content-Type: application/json
x-admin-key: your-admin-key

{
  "settings": {
    "mcpConfigs": [
      {
        "serverId": "mcp_google_calendar",
        "enabled": true,
        "credentials": {
          "GOOGLE_CLIENT_ID": "tenant-a-client-id.apps.googleusercontent.com",
          "GOOGLE_CLIENT_SECRET": "tenant-a-secret",
          "GOOGLE_REFRESH_TOKEN": "tenant-a-refresh-token"
        }
      },
      {
        "serverId": "mcp_github",
        "enabled": true,
        "credentials": {
          "GITHUB_TOKEN": "ghp_tenant_a_personal_access_token"
        }
      }
    ]
  }
}
```

---

## API Reference

### MCP Server Management

#### List MCP Servers

```http
GET /api/mcp-servers
x-admin-key: your-admin-key
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "mcp_abc123",
      "name": "Google Calendar",
      "description": "Manage Google Calendar events",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-google-calendar"],
      "requiredEnv": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"],
      "enabled": true,
      "createdAt": "2025-10-10T12:00:00Z",
      "updatedAt": "2025-10-10T12:00:00Z"
    }
  ]
}
```

#### Create MCP Server

```http
POST /api/mcp-servers
Content-Type: application/json
x-admin-key: your-admin-key

{
  "name": "GitHub",
  "description": "GitHub repository integration",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "requiredEnv": ["GITHUB_TOKEN"],
  "enabled": true
}
```

#### Update MCP Server

```http
PATCH /api/mcp-servers/mcp_abc123
Content-Type: application/json
x-admin-key: your-admin-key

{
  "enabled": false
}
```

#### Delete MCP Server

```http
DELETE /api/mcp-servers/mcp_abc123
x-admin-key: your-admin-key
```

### Chat API with MCP Tools

The chat endpoint automatically discovers and uses MCP tools based on tenant configuration.

```http
POST /api/chat
Content-Type: application/json
x-tenant-key: tenant-api-key

{
  "tenantId": "tenant_abc123",
  "message": "What meetings do I have tomorrow?",
  "conversationId": "conv_xyz789"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "You have 3 meetings tomorrow:\n1. Team Standup at 9:00 AM\n2. Client Review at 2:00 PM\n3. Project Planning at 4:30 PM",
    "conversationId": "conv_xyz789",
    "metadata": {
      "model": "gpt-4o",
      "tokens": {
        "prompt": 450,
        "completion": 120,
        "total": 570
      },
      "latency": 2340,
      "toolsUsed": true,
      "mcpEnabled": true
    }
  }
}
```

### MCP Client Service API

**File**: `apps/api/src/services/mcpClient.ts`

#### `connectToMcpServer()`

Connects to an MCP server with tenant-specific credentials and discovers available tools.

```typescript
async function connectToMcpServer(
  serverId: string,
  tenantCredentials: Record<string, string> = {}
): Promise<McpTool[]>
```

**Parameters**:
- `serverId`: Global MCP server ID
- `tenantCredentials`: Tenant-specific environment variables

**Returns**: Array of available tools

**Example**:
```typescript
const tools = await connectToMcpServer('mcp_google_calendar', {
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'secret',
  GOOGLE_REFRESH_TOKEN: 'token'
});
// Returns: [{ name: 'list_events', description: '...', inputSchema: {...} }, ...]
```

#### `executeMcpTool()`

Executes a tool call on an MCP server.

```typescript
async function executeMcpTool(
  connectionKey: string,
  toolName: string,
  args: Record<string, any>
): Promise<McpToolResult>
```

**Parameters**:
- `connectionKey`: Unique connection identifier (serverId + credentials hash)
- `toolName`: Name of the tool to execute
- `args`: Tool arguments

**Returns**: Tool execution result

**Example**:
```typescript
const result = await executeMcpTool(
  'mcp_google_calendar:MTIzNDU2Nzg5MA==',
  'create_event',
  {
    title: 'Team Meeting',
    start: '2025-11-19T14:00:00Z',
    duration: 60
  }
);
// Returns: { content: 'Event created successfully', isError: false }
```

#### `getAvailableMcpTools()`

Gets all available tools from enabled MCP servers for a tenant.

```typescript
async function getAvailableMcpTools(
  tenantId: string
): Promise<Array<{
  connectionKey: string;
  serverId: string;
  serverName: string;
  tools: McpTool[];
}>>
```

**Parameters**:
- `tenantId`: Tenant ID

**Returns**: Array of MCP servers with their tools

---

## Available MCP Tools

### Official MCP Servers

#### 1. Google Calendar

**Installation**: `npm install -g @modelcontextprotocol/server-google-calendar`

**Required Credentials**:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`

**Available Tools**:
- `list_events` - List upcoming calendar events
- `create_event` - Create a new calendar event
- `update_event` - Update an existing event
- `delete_event` - Delete a calendar event

#### 2. GitHub

**Installation**: `npm install -g @modelcontextprotocol/server-github`

**Required Credentials**:
- `GITHUB_TOKEN` - Personal access token

**Available Tools**:
- `search_repositories` - Search GitHub repositories
- `search_issues` - Search issues and pull requests
- `get_file_contents` - Read file contents from repository
- `create_pull_request` - Create a new pull request

#### 3. File System

**Installation**: `npm install -g @modelcontextprotocol/server-filesystem`

**Required Credentials**: None

**Command Args**: `["/allowed/path"]` - Specify allowed directory

**Available Tools**:
- `read_file` - Read file contents
- `write_file` - Write to a file
- `list_directory` - List directory contents
- `search_files` - Search for files

#### 4. PostgreSQL

**Installation**: `npm install -g @modelcontextprotocol/server-postgres`

**Required Credentials**:
- `POSTGRES_URL` - Database connection string

**Available Tools**:
- `query` - Execute SQL query
- `describe_table` - Get table schema

#### 5. Telegram

**Installation**: `npm install -g @modelcontextprotocol/server-telegram`

**Required Credentials**:
- `TELEGRAM_BOT_TOKEN` - Bot API token

**Available Tools**:
- `send_message` - Send message to user/chat
- `send_photo` - Send photo to user/chat

### Custom MCP Servers

You can build custom MCP servers for proprietary integrations. See the [MCP Protocol Specification](https://spec.modelcontextprotocol.io/) for implementation details.

---

## Security Model

### Tenant Isolation

Each tenant provides their own credentials, ensuring complete isolation:

```
Tenant A → Google Calendar A (with Tenant A's credentials)
Tenant B → Google Calendar B (with Tenant B's credentials)
```

**Security Features**:
- **Separate Credentials**: Each tenant uses their own API keys/tokens
- **Connection Pooling**: Connections keyed by serverId + credentials hash
- **No Credential Sharing**: Tenants cannot access each other's services
- **Secure Storage**: Credentials stored in tenant settings (encrypted at database level)

### Connection Keys

Each MCP server connection has a unique key based on credentials:

```typescript
const connectionKey = `${serverId}:${credentialsHash}`;

// Examples:
"mcp_google_calendar:MTIzNDU2Nzg5MA=="  // Tenant A
"mcp_google_calendar:OTg3NjU0MzIxMA=="  // Tenant B
```

This ensures:
- Multiple tenants can use the same MCP server type
- Each gets their own isolated connection
- Credentials are never mixed between tenants

### Best Practices

1. **Least Privilege**: Grant MCP servers minimum required permissions
2. **Credential Rotation**: Regularly rotate API keys and tokens
3. **Audit Logging**: Log all tool executions with tenant context
4. **Input Validation**: Validate all tool arguments before execution
5. **Error Handling**: Don't leak credential details in error messages

---

## Function Calling with LLM Providers

MCP tools are exposed to LLMs via function calling APIs.

### Supported Providers

| Provider | Function Calling | MCP Support | Notes |
|----------|-----------------|-------------|-------|
| **OpenAI** | ✅ Yes | Full support | Best reliability, GPT-4o recommended |
| **DeepSeek** | ✅ Yes | Full support | Cost-effective, ~17x cheaper than GPT-4 |
| **Ollama** | ✅ Yes | Full support | Local models, free, function calling added |

### Smart Routing Logic

The platform implements intelligent routing based on tool availability:

```typescript
// 1. Discover tools
const mcpTools = await getAvailableMcpTools(tenantId);
const hasTools = mcpTools.length > 0;

// 2. Check provider supports function calling
const supportsFunctionCalling = ['openai', 'deepseek', 'ollama'].includes(provider);

if (hasTools && supportsFunctionCalling) {
  // 3. First LLM call: Let LLM decide if tools are needed
  const response = await callLlm(config, messages, mcpTools);

  if (response.toolCalls) {
    // 4. Execute tool calls
    for (const toolCall of response.toolCalls) {
      const result = await executeMcpTool(
        serverConnectionKey,
        toolCall.name,
        toolCall.arguments
      );
      messages.push({
        role: 'tool',
        content: result.content,
        name: toolCall.name,
        tool_call_id: toolCall.id
      });
    }

    // 5. Second LLM call: Generate final response with tool results
    finalResponse = await callLlm(config, messages);
  }
} else {
  // No tools or provider doesn't support function calling
  finalResponse = await callLlm(config, messages);
}
```

### Tool Execution Flow Example

**User Message**: "Schedule a meeting tomorrow at 2pm"

1. **Tool Discovery**: Platform detects Google Calendar is available
2. **First LLM Call**: OpenAI/DeepSeek decides tool use is needed
   - Returns: `{ toolCalls: [{ name: 'create_event', arguments: {...} }] }`
3. **Tool Execution**: Platform calls Google Calendar MCP server
   - Returns: `{ content: 'Event created: meeting-id-123', isError: false }`
4. **Second LLM Call**: LLM generates user-friendly response
   - Returns: "I've scheduled your meeting for tomorrow at 2:00 PM"
5. **Response to User**: Final message with confirmation

---

## Operations

### Monitoring

#### Check Active MCP Connections

```bash
# View API logs
pm2 logs meta-chat-api

# Filter for MCP events
pm2 logs meta-chat-api | grep "[MCP]"
```

**Log Examples**:
```
[MCP] Connecting to server: Google Calendar (tenant-specific)
[MCP] Google Calendar connected with 4 tools
[MCP] Executing tool create_event on Google Calendar
[MCP] Tool execution error: Invalid credentials
```

#### Database Queries

```sql
-- List all MCP servers
SELECT id, name, enabled, created_at FROM mcp_servers;

-- Find messages with tool usage
SELECT
  m.id,
  m.tenant_id,
  m.metadata->>'toolsUsed' as tools_used,
  m.metadata->>'mcpEnabled' as mcp_enabled,
  m.created_at
FROM messages m
WHERE m.metadata->>'toolsUsed' = 'true'
ORDER BY m.created_at DESC
LIMIT 10;
```

### Troubleshooting

#### Issue: MCP Server Not Starting

**Symptoms**: Tool calls fail with "MCP server connection not found"

**Solutions**:
1. Check command is correct (`npx`, `node`, etc.)
2. Verify args are properly formatted (array of strings)
3. Test command manually:
   ```bash
   npx -y @modelcontextprotocol/server-google-calendar
   ```
4. Check API logs: `pm2 logs meta-chat-api | grep MCP`
5. Verify tenant has provided all required credentials

#### Issue: Tools Not Discovered

**Symptoms**: LLM doesn't see available tools

**Solutions**:
1. Ensure MCP server is globally enabled
2. Check tenant has server enabled in `mcpConfigs`
3. Verify provider supports function calling (OpenAI/DeepSeek/Ollama)
4. Check tenant credentials are correct
5. Review tool discovery logs

#### Issue: Tool Execution Timeout

**Symptoms**: Tool calls hang or timeout after 30 seconds

**Solutions**:
1. Check network connectivity to external APIs
2. Verify credentials are valid
3. Test API directly (e.g., Google Calendar API)
4. Increase timeout in `mcpClient.ts` if needed
5. Check MCP server stderr logs

#### Issue: Credentials Not Working

**Symptoms**: Tool execution fails with authentication errors

**Solutions**:
1. Verify credentials are correctly entered in tenant settings
2. Check environment variable names match `requiredEnv`
3. Test credentials directly with the service
4. Ensure proper format (e.g., Google refresh tokens)
5. Check credential expiration/rotation

---

## Code References

### Core Implementation Files

1. **MCP Client Service**
   - **Path**: `apps/api/src/services/mcpClient.ts`
   - **Purpose**: Manages MCP server connections, tool discovery, and execution
   - **Key Functions**: `connectToMcpServer()`, `executeMcpTool()`, `getAvailableMcpTools()`

2. **LLM Providers Service**
   - **Path**: `apps/api/src/services/llmProviders.ts`
   - **Purpose**: Unified interface for calling LLMs with function calling support
   - **Key Functions**: `callOpenAI()`, `callDeepSeek()`, `callOllama()`, `callLlm()`

3. **Chat Route**
   - **Path**: `apps/api/src/routes/chat.ts`
   - **Purpose**: Main chat endpoint with MCP tool integration
   - **Flow**: Tool discovery → Smart routing → Tool execution → Response

4. **MCP Server Routes**
   - **Path**: `apps/api/src/routes/mcpServers.ts`
   - **Purpose**: CRUD operations for MCP servers
   - **Endpoints**: GET, POST, PATCH, DELETE `/api/mcp-servers`

5. **Database Schema**
   - **Path**: `packages/database/prisma/schema.prisma`
   - **Model**: `McpServer`
   - **Fields**: id, name, command, args, requiredEnv, enabled

---

## Related Documentation

### Internal Documentation

- [MCP Integration Guide](/home/deploy/meta-chat-platform/MCP-INTEGRATION-GUIDE.md) - Legacy detailed guide
- [MCP Per-Tenant Credentials](/home/deploy/meta-chat-platform/MCP-PER-TENANT-CREDENTIALS.md) - Architecture explanation
- [API MCP Endpoints](/home/deploy/meta-chat-platform/docs/API-MCP-ENDPOINTS.md) - API reference
- [LLM Providers](/home/deploy/meta-chat-platform/docs/LLM-PROVIDERS.md) - Provider configuration guide

### External Resources

- [Anthropic MCP Documentation](https://github.com/anthropics/mcp)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Official MCP Servers](https://github.com/modelcontextprotocol/servers)
- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [DeepSeek API Documentation](https://platform.deepseek.com/api-docs/)

---

**Built with care for extensible AI assistants**
