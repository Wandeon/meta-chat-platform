/**
 * MCP (Model Context Protocol) Client Service
 * Connects to MCP servers, discovers tools, and executes tool calls
 */

import { spawn, ChildProcess } from 'child_process';
import { getPrismaClient } from '@meta-chat/database';

const prisma = getPrismaClient();

export interface McpTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface McpToolCall {
  toolName: string;
  arguments: Record<string, any>;
}

export interface McpToolResult {
  content: string;
  isError: boolean;
}

interface McpServerConnection {
  serverId: string;
  serverName: string;
  process: ChildProcess;
  tools: McpTool[];
  messageId: number;
  pendingRequests: Map<number, { resolve: Function; reject: Function }>;
}

const activeConnections = new Map<string, McpServerConnection>();

/**
 * Connect to an MCP server and discover its tools
 * @param serverId - Global MCP server ID
 * @param tenantCredentials - Tenant-specific environment variables (credentials)
 */
export async function connectToMcpServer(
  serverId: string,
  tenantCredentials: Record<string, string> = {}
): Promise<McpTool[]> {
  // Create unique connection key including tenant credentials hash
  const credentialsKey = JSON.stringify(tenantCredentials);
  const connectionKey = `${serverId}:${Buffer.from(credentialsKey).toString('base64').slice(0, 20)}`;

  // Check if already connected with same credentials
  const existing = activeConnections.get(connectionKey);
  if (existing) {
    return existing.tools;
  }

  const server = await prisma.mcpServer.findUnique({
    where: { id: serverId },
  });

  if (!server || !server.enabled) {
    throw new Error(`MCP server ${serverId} not found or disabled`);
  }

  console.log(`[MCP] Connecting to server: ${server.name} (tenant-specific)`);

  // Spawn MCP server process with tenant-specific credentials
  const args = server.args as string[];
  const env = { ...process.env, ...tenantCredentials };

  const childProcess = spawn(server.command, args, {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const connection: McpServerConnection = {
    serverId: connectionKey, // Use connection-specific key
    serverName: server.name,
    process: childProcess,
    tools: [],
    messageId: 1,
    pendingRequests: new Map(),
  };

  // Handle stdout (responses from MCP server)
  let buffer = '';
  childProcess.stdout?.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line);
        handleMcpMessage(connection, message);
      } catch (err) {
        console.error(`[MCP] Failed to parse message from ${server.name}:`, err);
      }
    }
  });

  // Handle stderr (errors)
  childProcess.stderr?.on('data', (data) => {
    console.error(`[MCP] ${server.name} stderr:`, data.toString());
  });

  // Handle process exit
  childProcess.on('exit', (code) => {
    console.log(`[MCP] ${server.name} process exited with code ${code}`);
    activeConnections.delete(connectionKey);
  });

  activeConnections.set(connectionKey, connection);

  // Initialize connection
  await sendMcpRequest(connection, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {
      roots: { listChanged: false },
      sampling: {},
    },
    clientInfo: {
      name: 'meta-chat-platform',
      version: '1.0.0',
    },
  });

  // List available tools
  const toolsResponse = await sendMcpRequest(connection, 'tools/list', {});
  connection.tools = toolsResponse.tools || [];

  console.log(`[MCP] ${server.name} connected with ${connection.tools.length} tools`);

  return connection.tools;
}

/**
 * Execute a tool call on an MCP server
 * @param connectionKey - Connection key (serverId + credentials hash)
 * @param toolName - Name of the tool to execute
 * @param args - Tool arguments
 */
export async function executeMcpTool(
  connectionKey: string,
  toolName: string,
  args: Record<string, any>
): Promise<McpToolResult> {
  let connection = activeConnections.get(connectionKey);

  if (!connection) {
    // Connection should already exist from tool discovery
    throw new Error(`MCP server connection not found: ${connectionKey}`);
  }

  console.log(`[MCP] Executing tool ${toolName} on ${connection.serverName}`);

  try {
    const result = await sendMcpRequest(connection, 'tools/call', {
      name: toolName,
      arguments: args,
    });

    // Extract text content from result
    const content = result.content
      ?.map((c: any) => (c.type === 'text' ? c.text : ''))
      .join('\n')
      .trim();

    return {
      content: content || JSON.stringify(result),
      isError: result.isError || false,
    };
  } catch (error: any) {
    console.error(`[MCP] Tool execution error:`, error);
    return {
      content: `Error executing tool: ${error.message}`,
      isError: true,
    };
  }
}

/**
 * Get all tools from enabled MCP servers for a tenant with tenant-specific credentials
 */
export async function getAvailableMcpTools(
  tenantId: string
): Promise<{ connectionKey: string; serverId: string; serverName: string; tools: McpTool[] }[]> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return [];
  }

  const settings = tenant.settings as any;
  const mcpConfigs = settings?.mcpConfigs || [];

  if (mcpConfigs.length === 0) {
    return [];
  }

  // Get all enabled server IDs
  const enabledServerIds = mcpConfigs
    .filter((config: any) => config.enabled)
    .map((config: any) => config.serverId);

  if (enabledServerIds.length === 0) {
    return [];
  }

  const servers = await prisma.mcpServer.findMany({
    where: {
      id: { in: enabledServerIds },
      enabled: true,
    },
  });

  const results = [];
  for (const server of servers) {
    try {
      // Find tenant-specific credentials for this server
      const mcpConfig = mcpConfigs.find((c: any) => c.serverId === server.id);
      const tenantCredentials = mcpConfig?.credentials || {};

      // Connect with tenant-specific credentials
      const tools = await connectToMcpServer(server.id, tenantCredentials);

      // Generate connection key
      const credentialsKey = JSON.stringify(tenantCredentials);
      const connectionKey = `${server.id}:${Buffer.from(credentialsKey).toString('base64').slice(0, 20)}`;

      results.push({
        connectionKey,
        serverId: server.id,
        serverName: server.name,
        tools,
      });
    } catch (error: any) {
      console.error(`[MCP] Failed to connect to ${server.name}:`, error.message);
    }
  }

  return results;
}

/**
 * Disconnect from an MCP server
 */
export function disconnectMcpServer(serverId: string): void {
  const connection = activeConnections.get(serverId);
  if (connection) {
    connection.process.kill();
    activeConnections.delete(serverId);
    console.log(`[MCP] Disconnected from ${connection.serverName}`);
  }
}

/**
 * Disconnect from all MCP servers
 */
export function disconnectAllMcpServers(): void {
  for (const [serverId] of activeConnections) {
    disconnectMcpServer(serverId);
  }
}

// ============= Internal Helpers =============

function handleMcpMessage(connection: McpServerConnection, message: any): void {
  if (message.id && connection.pendingRequests.has(message.id)) {
    const request = connection.pendingRequests.get(message.id)!;
    connection.pendingRequests.delete(message.id);

    if (message.error) {
      request.reject(new Error(message.error.message || 'MCP error'));
    } else {
      request.resolve(message.result);
    }
  }
}

function sendMcpRequest(
  connection: McpServerConnection,
  method: string,
  params: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = connection.messageId++;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    connection.pendingRequests.set(id, { resolve, reject });

    const message = JSON.stringify(request) + '\n';
    connection.process.stdin?.write(message);

    // Timeout after 30 seconds
    setTimeout(() => {
      if (connection.pendingRequests.has(id)) {
        connection.pendingRequests.delete(id);
        reject(new Error('MCP request timeout'));
      }
    }, 30000);
  });
}
