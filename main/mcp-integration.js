// main/mcp-integration.js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class MCPManager {
  constructor() {
    this.clients = new Map();
  }

  // 连接到 MCP Server
  async connect(serverName, command, args = []) {
    const transport = new StdioClientTransport({ command, args });
    const client = new Client({ name: 'smartdesk', version: '1.0.0' });
    await client.connect(transport);
    
    this.clients.set(serverName, client);
    
    // 获取可用工具
    const { tools } = await client.listTools();
    console.log(`MCP ${serverName} 提供了 ${tools.length} 个工具`);
    
    return tools;
  }

  // 调用 MCP 工具
  async callTool(serverName, toolName, args) {
    const client = this.clients.get(serverName);
    if (!client) throw new Error(`MCP Server ${serverName} 未连接`);
    
    return client.callTool({ name: toolName, arguments: args });
  }

  // 将 MCP 工具转换为 Vercel AI SDK 格式
  convertToAITools(serverName, mcpTools) {
    const tools = {};
    
    for (const mcpTool of mcpTools) {
      tools[`mcp_${serverName}_${mcpTool.name}`] = tool({
        description: mcpTool.description || mcpTool.name,
        parameters: z.object(mcpTool.inputSchema || {}),
        execute: async (args) => {
          const result = await this.callTool(serverName, mcpTool.name, args);
          return result;
        },
      });
    }
    
    return tools;
  }
}

export { MCPManager };