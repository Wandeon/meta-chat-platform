# MCP Integration Guide

**Model Context Protocol (MCP) Server Integration for Meta Chat Platform**

This guide explains how to configure and use MCP servers to extend your AI chatbots with external tools and integrations like Google Calendar, GitHub, file systems, and more.

---

## Table of Contents

1. [What is MCP?](#what-is-mcp)
2. [Architecture Overview](#architecture-overview)
3. [Quick Start](#quick-start)
4. [Configuring MCP Servers](#configuring-mcp-servers)
5. [Enabling MCP for Tenants](#enabling-mcp-for-tenants)
6. [Supported Providers](#supported-providers)
7. [Smart Routing Logic](#smart-routing-logic)
8. [Example Configurations](#example-configurations)
9. [API Reference](#api-reference)
10. [Troubleshooting](#troubleshooting)

---

## What is MCP?

**Model Context Protocol (MCP)** is Anthropic's open standard for connecting AI assistants to external tools and data sources. It provides:

- **Standardized Communication**: JSON-RPC 2.0 over stdio for tool discovery and execution
- **Tool Discovery**: Dynamic tool listing from MCP servers
- **Secure Execution**: Sandboxed tool execution with proper error handling
- **Extensibility**: Connect any tool that implements the MCP protocol

### Benefits

- **Pre-built Integrations**: Use official MCP servers for Google Calendar, GitHub, Slack, etc.
- **Custom Tools**: Build your own MCP servers for proprietary integrations
- **Multi-Provider Support**: Works with OpenAI, DeepSeek, and other function-calling LLMs
- **Tenant Isolation**: Per-tenant control over which tools are available

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Dashboard                         │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │ Global MCP       │    │ Tenant Settings              │  │
│  │ Servers          │───▶│ - Enable/Disable MCP Servers │  │
│  │ - Add/Edit/Delete│    │ - Toggle per server          │  │
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
│  │ MCP Client Service                                    │  │
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

### Smart Routing

The platform intelligently routes requests based on:

1. **Tools Available**: If MCP servers are enabled and provide tools
2. **Provider Capability**: Uses OpenAI/DeepSeek for function calling when tools are present
3. **Quick Acknowledgment**: Optionally sends Ollama response before executing tools
4. **Fallback**: Uses configured provider when no tools are needed

---

## Quick Start

### Step 1: Install an MCP Server

Example: Google Calendar MCP server

```bash
# Install globally
npm install -g @modelcontextprotocol/server-google-calendar

# Or use npx (no installation needed)
npx @modelcontextprotocol/server-google-calendar
```

### Step 2: Add MCP Server in Dashboard

1. Navigate to **MCP Servers** in the admin dashboard
2. Click **+ Add MCP Server**
3. Fill in the form:
   - **Name**: `Google Calendar`
   - **Description**: `Access and manage Google Calendar events`
   - **Command**: `npx`
   - **Arguments**:
     - `-y` (optional: skip confirmation)
     - `@modelcontextprotocol/server-google-calendar`
   - **Environment Variables**:
     - `GOOGLE_CLIENT_ID`: `your-client-id`
     - `GOOGLE_CLIENT_SECRET`: `your-client-secret`
   - **Enabled**: ✓ (checked)
4. Click **Create Server**

### Step 3: Enable for Tenant

1. Go to **Tenants** → Select tenant → **Settings**
2. Scroll to **MCP Tool Integrations** section
3. Toggle **Google Calendar** to **Enabled**
4. Click **Save Settings**

### Step 4: Configure Provider

1. In the same **Tenant Settings** page
2. Under **AI Model Configuration**:
   - **Provider**: Select `OpenAI` or `DeepSeek` (required for function calling)
   - **Model**: Select a model (e.g., `GPT-4o`)
   - **API Key**: Enter your API key (optional if system default is set)
3. Click **Save Settings**

### Step 5: Test

Send a message to your chatbot:

```
User: "What meetings do I have tomorrow?"

AI: [Executes Google Calendar tool call]
    "You have 3 meetings tomorrow:
     1. Team Standup at 9:00 AM
     2. Client Review at 2:00 PM
     3. Project Planning at 4:30 PM"
```

---

## Configuring MCP Servers

### Global MCP Server Configuration

MCP servers are configured globally by admins and then enabled per tenant.

**Database Model** (`packages/database/prisma/schema.prisma`):

```prisma
model McpServer {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  command     String   // e.g., "npx", "node", "python"
  args        Json     @default("[]") // Command arguments as array
  env         Json     @default("{}") // Environment variables
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("mcp_servers")
}
```

**REST API Endpoints**:

- `GET /api/mcp-servers` - List all MCP servers
- `POST /api/mcp-servers` - Create MCP server
- `PATCH /api/mcp-servers/:id` - Update MCP server
- `DELETE /api/mcp-servers/:id` - Delete MCP server

### Per-Tenant Enablement

Tenants control which MCP servers they want to use via the `enabledMcpServers` array in their settings:

```typescript
interface TenantSettings {
  enabledMcpServers?: string[]; // Array of MCP server IDs
  // ... other settings
}
```

**Tenant Settings Update**:

```http
PATCH /api/tenants/:tenantId
{
  "settings": {
    "enabledMcpServers": ["server-id-1", "server-id-2"]
  }
}
```

---

## Enabling MCP for Tenants

### Dashboard UI

1. **Navigate to Tenant Settings**:
   - Go to **Tenants** → Click on a tenant → **Settings** tab

2. **MCP Tool Integrations Section**:
   - Lists all globally-enabled MCP servers
   - Each server has an ON/OFF toggle
   - Enabled servers show with blue border
   - Disabled servers show with gray border

3. **Save Changes**:
   - Click **Save Settings** at the bottom
   - Settings are persisted to database

### API Integration

```typescript
// Enable Google Calendar MCP server for a tenant
const response = await fetch('/api/tenants/tenant_abc123', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-key': 'your-admin-key'
  },
  body: JSON.stringify({
    settings: {
      enabledMcpServers: ['mcp_google_calendar']
    }
  })
});
```

---

## Supported Providers

### Function Calling Support

MCP requires function calling support from the LLM provider.

| Provider | Function Calling | MCP Support | Pricing |
|----------|-----------------|-------------|---------|
| **OpenAI** ✅ | Yes | Full support | $2.50/1M tokens (GPT-4o) |
| **DeepSeek** ✅ | Yes | Full support | $0.14/1M tokens (DeepSeek Chat) |
| **Ollama** ⚠️ | No | Quick acknowledgment only | Free (local) |

### Provider Configuration

**OpenAI (Recommended)**:
- Best function calling support
- Highly reliable
- Models: GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo

**DeepSeek (Cost-Effective)**:
- ~17x cheaper than OpenAI GPT-4
- Supports function calling
- Models: DeepSeek Chat, DeepSeek Coder

**Ollama (Local/Free)**:
- No function calling support
- Can send quick acknowledgment before tool execution
- Models: Llama 3.1, Mistral, Qwen, etc.

---

## Smart Routing Logic

The platform implements intelligent routing based on tool availability and provider capabilities.

### Routing Decision Tree

```typescript
// Simplified routing logic from apps/api/src/routes/chat.ts

// 1. Check for available tools
const mcpTools = await getAvailableMcpTools(tenantId);
const hasTools = mcpTools.length > 0;

// 2. Determine if function calling should be used
const shouldUseFunctionCalling =
  hasTools && (provider === 'openai' || provider === 'deepseek');

if (shouldUseFunctionCalling) {
  // 3. First call: Let LLM decide if tools are needed
  const response = await callLlm(config, messages, mcpTools);

  if (response.toolCalls && response.toolCalls.length > 0) {
    // 4. Optional: Send quick Ollama acknowledgment
    if (ollamaConfigured) {
      await sendQuickAck(ollamaConfig, userMessage);
    }

    // 5. Execute tool calls via MCP
    for (const toolCall of response.toolCalls) {
      const result = await executeMcpTool(
        serverId,
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

    // 6. Second call: Get final response with tool results
    finalResponse = await callLlm(config, messages);
  }
} else {
  // No tools or Ollama: use configured provider
  finalResponse = await callLlm(config, messages);
}
```

### Example Flow

**User**: "Schedule a meeting tomorrow at 2pm"

1. **Tool Detection**: System detects Google Calendar tool is available
2. **Provider Check**: Tenant uses OpenAI (supports function calling)
3. **First LLM Call**: OpenAI determines tool use is needed
   - Returns: `tools/call: create_event(title="Meeting", start="2025-10-11T14:00:00Z")`
4. **Quick Acknowledgment** (optional, if Ollama configured):
   - Ollama: "I'm scheduling that meeting for you, one moment..."
5. **Tool Execution**: MCP client executes `create_event` via Google Calendar server
   - Returns: `{"success": true, "eventId": "abc123", "link": "https://calendar.google.com/..."}`
6. **Second LLM Call**: OpenAI generates final response with tool result
   - Returns: "I've scheduled your meeting for tomorrow at 2:00 PM. Here's the calendar link: ..."
7. **Response**: User receives final message

---

## Example Configurations

### 1. Google Calendar

**Purpose**: Manage calendar events

**Installation**:
```bash
npm install -g @modelcontextprotocol/server-google-calendar
```

**MCP Server Configuration**:
- **Name**: `Google Calendar`
- **Command**: `npx`
- **Arguments**:
  - `-y`
  - `@modelcontextprotocol/server-google-calendar`
- **Environment Variables**:
  ```json
  {
    "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
    "GOOGLE_CLIENT_SECRET": "your-client-secret",
    "GOOGLE_REFRESH_TOKEN": "your-refresh-token"
  }
  ```

**Available Tools**:
- `list_events` - List upcoming events
- `create_event` - Create new event
- `update_event` - Update existing event
- `delete_event` - Delete event

---

### 2. GitHub Integration

**Purpose**: Search repositories, issues, create PRs

**Installation**:
```bash
npm install -g @modelcontextprotocol/server-github
```

**MCP Server Configuration**:
- **Name**: `GitHub`
- **Command**: `npx`
- **Arguments**:
  - `-y`
  - `@modelcontextprotocol/server-github`
- **Environment Variables**:
  ```json
  {
    "GITHUB_TOKEN": "ghp_your_personal_access_token"
  }
  ```

**Available Tools**:
- `search_repositories` - Search GitHub repositories
- `search_issues` - Search issues and PRs
- `get_file_contents` - Read file from repository
- `create_pull_request` - Create new PR

---

### 3. File System Access

**Purpose**: Read/write local files

**Installation**:
```bash
npm install -g @modelcontextprotocol/server-filesystem
```

**MCP Server Configuration**:
- **Name**: `File System`
- **Command**: `npx`
- **Arguments**:
  - `-y`
  - `@modelcontextprotocol/server-filesystem`
  - `/allowed/path/to/files`
- **Environment Variables**: (none required)

**Available Tools**:
- `read_file` - Read file contents
- `write_file` - Write to file
- `list_directory` - List directory contents
- `search_files` - Search for files

---

### 4. PostgreSQL Database

**Purpose**: Query database

**Installation**:
```bash
npm install -g @modelcontextprotocol/server-postgres
```

**MCP Server Configuration**:
- **Name**: `PostgreSQL`
- **Command**: `npx`
- **Arguments**:
  - `-y`
  - `@modelcontextprotocol/server-postgres`
- **Environment Variables**:
  ```json
  {
    "POSTGRES_URL": "postgresql://user:pass@localhost:5432/dbname"
  }
  ```

**Available Tools**:
- `query` - Execute SQL query
- `describe_table` - Get table schema

---

### 5. Custom MCP Server

**Purpose**: Your proprietary integration

**Example: Simple Echo Tool**

`echo-server.js`:
```javascript
#!/usr/bin/env node

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (line) => {
  const request = JSON.parse(line);

  let response;

  if (request.method === 'initialize') {
    response = {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'echo-server', version: '1.0.0' }
      }
    };
  } else if (request.method === 'tools/list') {
    response = {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        tools: [
          {
            name: 'echo',
            description: 'Echo back the input',
            inputSchema: {
              type: 'object',
              properties: {
                message: { type: 'string', description: 'Message to echo' }
              },
              required: ['message']
            }
          }
        ]
      }
    };
  } else if (request.method === 'tools/call') {
    const message = request.params.arguments.message;
    response = {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        content: [{ type: 'text', text: `Echo: ${message}` }],
        isError: false
      }
    };
  }

  console.log(JSON.stringify(response));
});
```

**MCP Server Configuration**:
- **Name**: `Echo Tool`
- **Command**: `node`
- **Arguments**:
  - `/path/to/echo-server.js`
- **Environment Variables**: (none)

---

## API Reference

### MCP Server CRUD

#### Create MCP Server

```http
POST /api/mcp-servers
Content-Type: application/json
x-admin-key: your-admin-key

{
  "name": "Google Calendar",
  "description": "Manage Google Calendar events",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-google-calendar"],
  "env": {
    "GOOGLE_CLIENT_ID": "...",
    "GOOGLE_CLIENT_SECRET": "..."
  },
  "enabled": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "mcp_abc123",
    "name": "Google Calendar",
    "description": "Manage Google Calendar events",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-google-calendar"],
    "env": { "GOOGLE_CLIENT_ID": "...", "GOOGLE_CLIENT_SECRET": "..." },
    "enabled": true,
    "createdAt": "2025-10-10T12:00:00Z",
    "updatedAt": "2025-10-10T12:00:00Z"
  }
}
```

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
      "enabled": true,
      "createdAt": "2025-10-10T12:00:00Z"
    }
  ]
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

### MCP Client Service

**File**: `apps/api/src/services/mcpClient.ts`

```typescript
// Connect to MCP server and discover tools
export async function connectToMcpServer(serverId: string): Promise<McpTool[]>

// Execute a tool via MCP server
export async function executeMcpTool(
  serverId: string,
  toolName: string,
  args: Record<string, any>
): Promise<McpToolResult>

// Get all available tools for a tenant
export async function getAvailableMcpTools(
  tenantId: string
): Promise<{ serverId: string; tools: McpTool[] }[]>
```

---

## Troubleshooting

### MCP Server Not Starting

**Symptom**: Tool calls fail with "MCP server not available"

**Solutions**:
1. Check command is correct: `npx`, `node`, `python`, etc.
2. Verify arguments are properly formatted (array of strings)
3. Ensure environment variables are set correctly
4. Check server logs: `pm2 logs meta-chat-api`
5. Test command manually in terminal:
   ```bash
   npx -y @modelcontextprotocol/server-google-calendar
   ```

### Tool Discovery Fails

**Symptom**: LLM doesn't see tools

**Solutions**:
1. Ensure MCP server is **globally enabled** (`enabled: true`)
2. Check tenant has server enabled in `enabledMcpServers` array
3. Verify provider supports function calling (OpenAI/DeepSeek)
4. Check API logs for tool discovery errors

### Tool Execution Timeout

**Symptom**: Tool calls hang or timeout

**Solutions**:
1. Increase timeout in `mcpClient.ts` (default: 30 seconds)
2. Check MCP server is responding to `tools/call` requests
3. Verify network connectivity for external APIs (Google, GitHub, etc.)
4. Check environment variables for API credentials

### Provider Not Using Tools

**Symptom**: LLM responds without calling tools

**Solutions**:
1. Ensure provider is OpenAI or DeepSeek (Ollama doesn't support function calling)
2. Check tool descriptions are clear and relevant
3. Verify LLM model supports function calling (GPT-4o, DeepSeek Chat)
4. Review conversation context - LLM must determine tools are needed

### Environment Variables Not Loading

**Symptom**: MCP server fails due to missing credentials

**Solutions**:
1. Check env object in MCP server configuration
2. Ensure proper JSON format: `{"KEY": "value"}`
3. Verify no typos in environment variable names
4. Check MCP server documentation for required variables

---

## Best Practices

### Security

1. **Least Privilege**: Only enable MCP servers that tenants need
2. **Credential Isolation**: Use separate API keys per MCP server
3. **Input Validation**: MCP servers should validate all inputs
4. **Audit Logging**: Log all tool executions with timestamps and user context

### Performance

1. **Connection Pooling**: Reuse MCP server connections when possible
2. **Timeout Configuration**: Set appropriate timeouts based on tool complexity
3. **Caching**: Cache tool discovery results (tools rarely change)
4. **Parallel Execution**: Execute independent tool calls in parallel

### User Experience

1. **Clear Tool Descriptions**: Help LLM understand when to use tools
2. **Error Messages**: Return user-friendly errors from tools
3. **Quick Acknowledgment**: Use Ollama for instant feedback when tools execute
4. **Progress Updates**: Stream progress for long-running tool executions

---

## Additional Resources

- [Anthropic MCP Documentation](https://github.com/anthropics/mcp)
- [Official MCP Servers](https://github.com/modelcontextprotocol/servers)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)

---

**Built with ❤️ for extensible AI assistants**
