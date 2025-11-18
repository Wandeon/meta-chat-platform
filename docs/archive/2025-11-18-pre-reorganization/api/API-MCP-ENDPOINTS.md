# MCP Server API Endpoints

**REST API documentation for MCP (Model Context Protocol) server management**

---

## Table of Contents

1. [Authentication](#authentication)
2. [MCP Servers](#mcp-servers)
3. [Tenant MCP Configuration](#tenant-mcp-configuration)
4. [Error Responses](#error-responses)
5. [Examples](#examples)

---

## Authentication

All MCP server endpoints require admin authentication via the `x-admin-key` header.

```http
x-admin-key: your-admin-api-key
```

---

## MCP Servers

### List All MCP Servers

Retrieve all configured MCP servers.

**Endpoint**: `GET /api/mcp-servers`

**Headers**:
```http
x-admin-key: your-admin-api-key
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "mcp_clxyz123abc",
      "name": "Google Calendar",
      "description": "Manage Google Calendar events",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-google-calendar"],
      "env": {
        "GOOGLE_CLIENT_ID": "123456.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "***"
      },
      "enabled": true,
      "createdAt": "2025-10-10T12:00:00.000Z",
      "updatedAt": "2025-10-10T12:00:00.000Z"
    },
    {
      "id": "mcp_clxyz456def",
      "name": "GitHub",
      "description": "Search repositories and manage issues",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_***"
      },
      "enabled": true,
      "createdAt": "2025-10-10T13:00:00.000Z",
      "updatedAt": "2025-10-10T13:00:00.000Z"
    }
  ]
}
```

---

### Get Single MCP Server

Retrieve a specific MCP server by ID.

**Endpoint**: `GET /api/mcp-servers/:id`

**Headers**:
```http
x-admin-key: your-admin-api-key
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "mcp_clxyz123abc",
    "name": "Google Calendar",
    "description": "Manage Google Calendar events",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-google-calendar"],
    "env": {
      "GOOGLE_CLIENT_ID": "123456.apps.googleusercontent.com",
      "GOOGLE_CLIENT_SECRET": "your-secret"
    },
    "enabled": true,
    "createdAt": "2025-10-10T12:00:00.000Z",
    "updatedAt": "2025-10-10T12:00:00.000Z"
  }
}
```

**Error**: `404 Not Found`
```json
{
  "success": false,
  "error": {
    "message": "MCP server not found"
  }
}
```

---

### Create MCP Server

Create a new global MCP server.

**Endpoint**: `POST /api/mcp-servers`

**Headers**:
```http
x-admin-key: your-admin-api-key
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Google Calendar",
  "description": "Manage Google Calendar events",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-google-calendar"],
  "env": {
    "GOOGLE_CLIENT_ID": "123456.apps.googleusercontent.com",
    "GOOGLE_CLIENT_SECRET": "your-secret",
    "GOOGLE_REFRESH_TOKEN": "your-refresh-token"
  },
  "enabled": true
}
```

**Field Descriptions**:
- `name` (required): Unique name for the MCP server
- `description` (optional): Human-readable description
- `command` (required): Executable command (e.g., `npx`, `node`, `python`)
- `args` (required): Array of command arguments
- `env` (optional): Environment variables as key-value object
- `enabled` (optional): Whether server is globally enabled (default: `true`)

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "mcp_clxyz123abc",
    "name": "Google Calendar",
    "description": "Manage Google Calendar events",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-google-calendar"],
    "env": {
      "GOOGLE_CLIENT_ID": "123456.apps.googleusercontent.com",
      "GOOGLE_CLIENT_SECRET": "your-secret",
      "GOOGLE_REFRESH_TOKEN": "your-refresh-token"
    },
    "enabled": true,
    "createdAt": "2025-10-10T12:00:00.000Z",
    "updatedAt": "2025-10-10T12:00:00.000Z"
  }
}
```

**Error**: `400 Bad Request`
```json
{
  "success": false,
  "error": {
    "message": "MCP server with this name already exists"
  }
}
```

---

### Update MCP Server

Update an existing MCP server.

**Endpoint**: `PATCH /api/mcp-servers/:id`

**Headers**:
```http
x-admin-key: your-admin-api-key
Content-Type: application/json
```

**Request Body** (all fields optional):
```json
{
  "name": "Google Calendar (Updated)",
  "description": "Updated description",
  "command": "node",
  "args": ["/path/to/server.js"],
  "env": {
    "GOOGLE_CLIENT_ID": "new-client-id"
  },
  "enabled": false
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "mcp_clxyz123abc",
    "name": "Google Calendar (Updated)",
    "description": "Updated description",
    "command": "node",
    "args": ["/path/to/server.js"],
    "env": {
      "GOOGLE_CLIENT_ID": "new-client-id"
    },
    "enabled": false,
    "createdAt": "2025-10-10T12:00:00.000Z",
    "updatedAt": "2025-10-10T14:30:00.000Z"
  }
}
```

**Error**: `404 Not Found`
```json
{
  "success": false,
  "error": {
    "message": "MCP server not found"
  }
}
```

---

### Delete MCP Server

Delete an MCP server permanently.

**Endpoint**: `DELETE /api/mcp-servers/:id`

**Headers**:
```http
x-admin-key: your-admin-api-key
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "MCP server deleted successfully"
  }
}
```

**Error**: `404 Not Found`
```json
{
  "success": false,
  "error": {
    "message": "MCP server not found"
  }
}
```

---

## Tenant MCP Configuration

### Get Tenant Settings (includes MCP config)

Retrieve tenant settings, including enabled MCP servers.

**Endpoint**: `GET /api/tenants/:tenantId`

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "tenant_abc123",
    "name": "Acme Corp",
    "settings": {
      "brandName": "Acme Support",
      "enabledMcpServers": ["mcp_clxyz123abc", "mcp_clxyz456def"],
      "llm": {
        "provider": "openai",
        "model": "gpt-4o"
      }
    }
  }
}
```

---

### Update Tenant MCP Configuration

Enable/disable MCP servers for a specific tenant.

**Endpoint**: `PATCH /api/tenants/:tenantId`

**Headers**:
```http
x-admin-key: your-admin-api-key
Content-Type: application/json
```

**Request Body**:
```json
{
  "settings": {
    "enabledMcpServers": ["mcp_clxyz123abc", "mcp_clxyz456def"]
  }
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "tenant_abc123",
    "name": "Acme Corp",
    "settings": {
      "brandName": "Acme Support",
      "enabledMcpServers": ["mcp_clxyz123abc", "mcp_clxyz456def"],
      "llm": {
        "provider": "openai",
        "model": "gpt-4o"
      }
    },
    "updatedAt": "2025-10-10T15:00:00.000Z"
  }
}
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Common Error Codes

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request body or parameters |
| 401 | `UNAUTHORIZED` | Missing or invalid admin API key |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists (e.g., duplicate name) |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Examples

### Example 1: Add Google Calendar MCP Server

```bash
curl -X POST https://chat.genai.hr/api/mcp-servers \
  -H "x-admin-key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Google Calendar",
    "description": "Manage calendar events",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-google-calendar"],
    "env": {
      "GOOGLE_CLIENT_ID": "123456.apps.googleusercontent.com",
      "GOOGLE_CLIENT_SECRET": "your-secret"
    },
    "enabled": true
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "mcp_clxyz123abc",
    "name": "Google Calendar",
    "enabled": true,
    "createdAt": "2025-10-10T12:00:00.000Z"
  }
}
```

---

### Example 2: Enable MCP Server for Tenant

```bash
curl -X PATCH https://chat.genai.hr/api/tenants/tenant_abc123 \
  -H "x-admin-key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "enabledMcpServers": ["mcp_clxyz123abc"]
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "tenant_abc123",
    "settings": {
      "enabledMcpServers": ["mcp_clxyz123abc"]
    },
    "updatedAt": "2025-10-10T15:00:00.000Z"
  }
}
```

---

### Example 3: List All MCP Servers

```bash
curl -X GET https://chat.genai.hr/api/mcp-servers \
  -H "x-admin-key: your-admin-key"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "mcp_clxyz123abc",
      "name": "Google Calendar",
      "enabled": true
    },
    {
      "id": "mcp_clxyz456def",
      "name": "GitHub",
      "enabled": true
    }
  ]
}
```

---

### Example 4: Disable MCP Server Globally

```bash
curl -X PATCH https://chat.genai.hr/api/mcp-servers/mcp_clxyz123abc \
  -H "x-admin-key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "mcp_clxyz123abc",
    "name": "Google Calendar",
    "enabled": false,
    "updatedAt": "2025-10-10T16:00:00.000Z"
  }
}
```

---

### Example 5: Delete MCP Server

```bash
curl -X DELETE https://chat.genai.hr/api/mcp-servers/mcp_clxyz123abc \
  -H "x-admin-key: your-admin-key"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "MCP server deleted successfully"
  }
}
```

---

## Integration with Chat Endpoint

When a tenant has MCP servers enabled, the chat endpoint automatically:

1. **Discovers Tools**: Connects to enabled MCP servers and fetches available tools
2. **Smart Routing**: Routes to function-calling provider (OpenAI/DeepSeek) when tools are available
3. **Tool Execution**: Executes tool calls via MCP protocol
4. **Response Generation**: Generates final response with tool results

**Chat Request**:
```bash
curl -X POST https://chat.genai.hr/api/chat \
  -H "x-api-key: tenant-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_abc123",
    "channelId": "channel_xyz",
    "message": "What meetings do I have tomorrow?",
    "conversationId": "conv_123"
  }'
```

**Response** (with Google Calendar tool execution):
```json
{
  "success": true,
  "data": {
    "response": "You have 3 meetings tomorrow:\n1. Team Standup at 9:00 AM\n2. Client Review at 2:00 PM\n3. Project Planning at 4:30 PM",
    "conversationId": "conv_123",
    "messageId": "msg_456",
    "metadata": {
      "toolsUsed": ["list_events"],
      "provider": "openai",
      "model": "gpt-4o"
    }
  }
}
```

---

## Best Practices

1. **Security**: Store sensitive credentials in environment variables, not in request bodies
2. **Naming**: Use descriptive, unique names for MCP servers
3. **Versioning**: Include version in server name when using multiple versions (e.g., "Google Calendar v2")
4. **Testing**: Test MCP servers manually before enabling for production tenants
5. **Monitoring**: Monitor tool execution logs for errors and performance
6. **Documentation**: Document required environment variables and setup steps for each MCP server

---

## Related Documentation

- [MCP Integration Guide](../MCP-INTEGRATION-GUIDE.md) - Complete setup and configuration guide
- [Dashboard Guide](../apps/dashboard/DASHBOARD-GUIDE.md) - UI-based MCP server management
- [Anthropic MCP Spec](https://spec.modelcontextprotocol.io/) - MCP protocol specification

---

**Built with ❤️ for extensible AI assistants**
