#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { spawnClaude } from './claude-cli.js';

const server = new Server(
  {
    name: 'claude-code-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const tools = [
  {
    name: 'claude_ask',
    description: 'Ask Claude Code CLI a question or request with full tool access',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The question or request to send to Claude',
        },
        sessionId: {
          type: 'string',
          description: 'Optional session ID to resume a previous conversation',
        },
        allowedTools: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of tools Claude is allowed to use',
        },
        workingDirectory: {
          type: 'string',
          description: 'Working directory for Claude to operate in',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'claude_plan',
    description: 'Ask Claude Code CLI to create a plan (read-only mode with planning tools)',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The planning request to send to Claude',
        },
        sessionId: {
          type: 'string',
          description: 'Optional session ID to resume a previous planning session',
        },
        workingDirectory: {
          type: 'string',
          description: 'Working directory for Claude to analyze',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'claude_resume',
    description: 'Resume a previous Claude Code CLI session',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID to resume',
        },
        query: {
          type: 'string',
          description: 'Optional additional query for the resumed session',
        },
        workingDirectory: {
          type: 'string',
          description: 'Working directory for the resumed session',
        },
      },
      required: ['sessionId'],
    },
  },
];

// Mock WebSocket interface for compatibility with existing spawnClaude function
class MockWebSocket {
  constructor() {
    this.responses = [];
  }
  
  send(data) {
    try {
      const parsed = JSON.parse(data);
      this.responses.push(parsed);
    } catch (e) {
      this.responses.push({ type: 'raw', data });
    }
  }
  
  getResponses() {
    return this.responses;
  }
  
  clear() {
    this.responses = [];
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    let options = {
      cwd: args.workingDirectory || process.cwd(),
    };
    
    const mockWs = new MockWebSocket();
    
    switch (name) {
      case 'claude_ask':
        options.sessionId = args.sessionId;
        options.resume = !!args.sessionId;
        options.toolsSettings = {
          allowedTools: args.allowedTools || [],
          disallowedTools: [],
          skipPermissions: false,
        };
        break;
        
      case 'claude_plan':
        options.sessionId = args.sessionId;
        options.resume = !!args.sessionId;
        options.permissionMode = 'plan';
        options.toolsSettings = {
          allowedTools: ['Read', 'Task', 'exit_plan_mode', 'TodoRead', 'TodoWrite'],
          disallowedTools: [],
          skipPermissions: false,
        };
        break;
        
      case 'claude_resume':
        if (!args.sessionId) {
          throw new Error('Session ID is required for resume operation');
        }
        options.sessionId = args.sessionId;
        options.resume = true;
        break;
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    
    // Execute Claude CLI
    await spawnClaude(args.query || '', options, mockWs);
    
    // Collect and format responses
    const responses = mockWs.getResponses();
    const output = responses
      .filter(r => r.type === 'claude-response' && r.data)
      .map(r => {
        if (r.data.content) {
          return r.data.content;
        }
        return JSON.stringify(r.data);
      })
      .join('\n');
    
    const sessionId = responses
      .find(r => r.type === 'session-created')?.sessionId ||
      responses
        .find(r => r.type === 'claude-response' && r.data?.session_id)?.data.session_id;
    
    return {
      content: [
        {
          type: 'text',
          text: output || 'Claude operation completed',
        },
      ],
      isError: false,
      ...(sessionId && { metadata: { sessionId } }),
    };
    
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Claude Code MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});