// server/index.ts
#!/usr/bin / env node

import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
    ErrorCode,
    McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ClaudeCodeExecutor } from './claude-executor.js';
import { OAuthProvider } from './auth/oauth-provider.js';
import { SessionManager } from './session-manager.js';
import { Logger } from './utils/logger.js';
import { RateLimiter } from './utils/rate-limiter.js';
import { MetricsCollector } from './utils/metrics.js';
import { WebhookManager } from './utils/webhooks.js';
import type { ServerConfig } from './types.js';

const logger = new Logger('MCP-Server');

// Load configuration from environment variables
const config: ServerConfig = {
    port: parseInt(process.env.PORT || '3000'),
    baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || '3000'}`,
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultWorkingDirectory: process.env.DEFAULT_WORKING_DIRECTORY || process.cwd(),
    defaultAllowedTools: process.env.DEFAULT_ALLOWED_TOOLS?.split(',').map(t => t.trim()).filter(Boolean) || [],
    oauth: {
        enabled: process.env.OAUTH_ENABLED === 'true',
        clientId: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        authorizationEndpoint: process.env.OAUTH_AUTHORIZATION_ENDPOINT,
        tokenEndpoint: process.env.OAUTH_TOKEN_ENDPOINT,
        issuer: process.env.OAUTH_ISSUER || process.env.BASE_URL || 'http://localhost:3000',
    },
    transport: (process.env.TRANSPORT || 'stdio') as 'stdio' | 'sse',
    maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '100'),
    sessionTimeoutMs: parseInt(process.env.SESSION_TIMEOUT_MS || `${24 * 60 * 60 * 1000}`),
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || `${15 * 60 * 1000}`),
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
    webhooksEnabled: process.env.WEBHOOKS_ENABLED === 'true',
    webhookUrl: process.env.WEBHOOK_URL,
};

// Tool definitions with annotations per MCP spec 2025-03-26
const tools: Tool[] = [
    {
        name: 'claude_ask',
        description: 'Ask Claude Code CLI a question or request with full tool access. Supports session management, subagents, hooks, checkpoints, background tasks, and custom configurations.',
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
                    description: 'List of tools Claude is allowed to use (e.g., Read, Write, Bash, Edit)',
                },
                disallowedTools: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of tools Claude is explicitly NOT allowed to use',
                },
                workingDirectory: {
                    type: 'string',
                    description: 'Working directory for Claude to operate in',
                },
                model: {
                    type: 'string',
                    description: 'Model to use (sonnet, opus, haiku, or specific version like claude-sonnet-4-5-20250929)',
                    enum: ['sonnet', 'opus', 'haiku', 'claude-sonnet-4-5-20250929', 'claude-opus-4-20250514'],
                },
                subagent: {
                    type: 'string',
                    description: 'Name of subagent to invoke (e.g., code-reviewer, sql-analyst)',
                },
                thinkingLevel: {
                    type: 'string',
                    description: 'Extended thinking mode: think, think-hard, think-harder, or ultrathink',
                    enum: ['think', 'think-hard', 'think-harder', 'ultrathink'],
                },
                hooks: {
                    type: 'object',
                    description: 'Hooks to execute at specific workflow points',
                    properties: {
                        preToolUse: { type: 'string', description: 'Path to script to run before tool use' },
                        postToolUse: { type: 'string', description: 'Path to script to run after tool use' },
                        sessionStart: { type: 'string', description: 'Path to script to run at session start' },
                        preCompact: { type: 'string', description: 'Path to script to run before compaction' },
                        onError: { type: 'string', description: 'Path to script to run on error' },
                    },
                },
                backgroundTask: {
                    type: 'boolean',
                    description: 'Run as background task (for long-running operations like dev servers)',
                },
                priority: {
                    type: 'string',
                    description: 'Task priority level',
                    enum: ['low', 'normal', 'high'],
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'claude_plan',
        description: 'Ask Claude Code CLI to create a plan using read-only mode with planning tools. Perfect for analyzing codebases and creating implementation strategies.',
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
                model: {
                    type: 'string',
                    description: 'Model to use for planning',
                    enum: ['sonnet', 'opus', 'haiku'],
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'claude_resume',
        description: 'Resume a previous Claude Code CLI session with full context preservation.',
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
    {
        name: 'claude_checkpoint',
        description: 'Manage checkpoints for Claude Code sessions. Create, list, restore, or compare checkpoints.',
        inputSchema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: 'Checkpoint action to perform',
                    enum: ['create', 'list', 'restore', 'compare', 'delete'],
                },
                sessionId: {
                    type: 'string',
                    description: 'Session ID for checkpoint operations',
                },
                checkpointId: {
                    type: 'string',
                    description: 'Specific checkpoint ID (for restore/delete/compare actions)',
                },
                compareWith: {
                    type: 'string',
                    description: 'Second checkpoint ID for comparison',
                },
                label: {
                    type: 'string',
                    description: 'Optional label for the checkpoint',
                },
            },
            required: ['action', 'sessionId'],
        },
    },
    {
        name: 'claude_subagent_list',
        description: 'List all available Claude Code subagents (both user-defined and plugin-provided).',
        inputSchema: {
            type: 'object',
            properties: {
                workingDirectory: {
                    type: 'string',
                    description: 'Working directory to check for project-specific subagents',
                },
                includePlugins: {
                    type: 'boolean',
                    description: 'Include plugin-provided subagents',
                    default: true,
                },
            },
        },
    },
    {
        name: 'claude_plugin_list',
        description: 'List all installed Claude Code plugins.',
        inputSchema: {
            type: 'object',
            properties: {
                scope: {
                    type: 'string',
                    description: 'Plugin scope filter',
                    enum: ['user', 'project', 'all'],
                    default: 'all',
                },
            },
        },
    },
    {
        name: 'claude_plugin_install',
        description: 'Install a Claude Code plugin.',
        inputSchema: {
            type: 'object',
            properties: {
                plugin: {
                    type: 'string',
                    description: 'Plugin name or URL to install',
                },
                scope: {
                    type: 'string',
                    description: 'Installation scope',
                    enum: ['user', 'project'],
                    default: 'user',
                },
            },
            required: ['plugin'],
        },
    },
    {
        name: 'claude_background_tasks',
        description: 'Manage background tasks (list, stop, view logs).',
        inputSchema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: 'Task action',
                    enum: ['list', 'stop', 'logs', 'restart'],
                },
                taskId: {
                    type: 'string',
                    description: 'Task ID (required for stop/logs/restart)',
                },
            },
            required: ['action'],
        },
    },
    {
        name: 'claude_abort',
        description: 'Abort a running Claude Code session or background task.',
        inputSchema: {
            type: 'object',
            properties: {
                sessionId: {
                    type: 'string',
                    description: 'Session ID to abort',
                },
                taskId: {
                    type: 'string',
                    description: 'Background task ID to abort',
                },
            },
        },
    },
];

// Initialize MCP server
const mcpServer = new Server(
    {
        name: 'claude-code-mcp',
        version: '2.0.0',
    },
    {
        capabilities: {
            tools: {},
            logging: {},
        },
    }
);

// Initialize managers
const executor = new ClaudeCodeExecutor(config);
const sessionManager = new SessionManager(config);
const oauthProvider = config.oauth.enabled ? new OAuthProvider(config.oauth) : null;
const rateLimiter = config.rateLimitEnabled ? new RateLimiter(config) : null;
const metricsCollector = config.metricsEnabled ? new MetricsCollector() : null;
const webhookManager = config.webhooksEnabled && config.webhookUrl ? new WebhookManager(config.webhookUrl) : null;

// Register request handlers
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const startTime = Date.now();

    try {
        // Check rate limit
        if (rateLimiter && !rateLimiter.checkLimit(request.meta?.userId || 'anonymous')) {
            throw new McpError(ErrorCode.InvalidRequest, 'Rate limit exceeded');
        }

        // Check concurrent sessions
        if (sessionManager.getActiveSessionCount() >= config.maxConcurrentSessions) {
            throw new McpError(ErrorCode.InvalidRequest, 'Maximum concurrent sessions reached');
        }

        let result;

        switch (name) {
            case 'claude_ask':
                result = await executor.executeAsk({
                    query: args.query,
                    sessionId: args.sessionId,
                    allowedTools: args.allowedTools || config.defaultAllowedTools,
                    disallowedTools: args.disallowedTools || [],
                    workingDirectory: args.workingDirectory || config.defaultWorkingDirectory,
                    model: args.model || 'sonnet',
                    subagent: args.subagent,
                    thinkingLevel: args.thinkingLevel,
                    hooks: args.hooks,
                    backgroundTask: args.backgroundTask,
                    priority: args.priority || 'normal',
                });
                break;

            case 'claude_plan':
                result = await executor.executePlan({
                    query: args.query,
                    sessionId: args.sessionId,
                    workingDirectory: args.workingDirectory || config.defaultWorkingDirectory,
                    model: args.model || 'sonnet',
                });
                break;

            case 'claude_resume':
                if (!args.sessionId) {
                    throw new McpError(ErrorCode.InvalidParams, 'Session ID is required for resume operation');
                }
                result = await executor.executeResume({
                    sessionId: args.sessionId,
                    query: args.query,
                    workingDirectory: args.workingDirectory || config.defaultWorkingDirectory,
                });
                break;

            case 'claude_checkpoint':
                result = await executor.executeCheckpoint({
                    action: args.action,
                    sessionId: args.sessionId,
                    checkpointId: args.checkpointId,
                    compareWith: args.compareWith,
                    label: args.label,
                });
                break;

            case 'claude_subagent_list':
                result = await executor.listSubagents({
                    workingDirectory: args.workingDirectory || config.defaultWorkingDirectory,
                    includePlugins: args.includePlugins !== false,
                });
                break;

            case 'claude_plugin_list':
                result = await executor.listPlugins({
                    scope: args.scope || 'all',
                });
                break;

            case 'claude_plugin_install':
                result = await executor.installPlugin({
                    plugin: args.plugin,
                    scope: args.scope || 'user',
                });
                break;

            case 'claude_background_tasks':
                result = await executor.manageBackgroundTasks({
                    action: args.action,
                    taskId: args.taskId,
                });
                break;

            case 'claude_abort':
                result = await executor.abortOperation({
                    sessionId: args.sessionId,
                    taskId: args.taskId,
                });
                break;

            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        // Collect metrics
        if (metricsCollector) {
            metricsCollector.recordToolCall(name, Date.now() - startTime, true);
        }

        // Send webhook notification
        if (webhookManager) {
            await webhookManager.notify({
                event: 'tool.completed',
                tool: name,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString(),
            });
        }

        return {
            content: [
                {
                    type: 'text',
                    text: result.output || 'Operation completed successfully',
                },
            ],
            isError: false,
            ...(result.metadata && { _meta: result.metadata }),
        };
    } catch (error) {
        logger.error(`Error executing tool ${name}:`, error);

        // Collect error metrics
        if (metricsCollector) {
            metricsCollector.recordToolCall(name, Date.now() - startTime, false);
        }

        // Send error webhook
        if (webhookManager) {
            await webhookManager.notify({
                event: 'tool.error',
                tool: name,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            });
        }

        if (error instanceof McpError) {
            throw error;
        }

        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
            ],
            isError: true,
        };
    }
});

// Graceful shutdown handler
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}, starting graceful shutdown...`);

    try {
        // Stop accepting new requests
        if (httpServer) {
            httpServer.close(() => {
                logger.info('HTTP server closed');
            });
        }

        // Abort active sessions
        await executor.abortAllSessions();

        // Clean up sessions
        sessionManager.clearAllSessions();

        // Close MCP connections
        await mcpServer.close();

        logger.info('Graceful shutdown complete');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// HTTP server instance (for transport mode)
let httpServer: any = null;

// Start server based on transport mode
async function main() {
    logger.info(`Starting Claude Code MCP Server v2.0.0`);
    logger.info(`Transport mode: ${config.transport}`);
    logger.info(`OAuth enabled: ${config.oauth.enabled}`);
    logger.info(`Metrics enabled: ${config.metricsEnabled}`);
    logger.info(`Webhooks enabled: ${config.webhooksEnabled}`);

    if (config.transport === 'stdio') {
        // Stdio transport for local usage
        const transport = new StdioServerTransport();
        await mcpServer.connect(transport);
        logger.info('Claude Code MCP Server running on stdio');
    } else {
        // SSE/HTTP transport for remote usage
        const app = express();
        app.use(express.json({ limit: '10mb' }));

        // Health check endpoint
        app.get('/health', (req, res) => {
            const health = {
                status: 'healthy',
                version: '2.0.0',
                uptime: process.uptime(),
                activeSessions: sessionManager.getActiveSessionCount(),
                transport: config.transport,
            };

            if (metricsCollector) {
                Object.assign(health, { metrics: metricsCollector.getMetrics() });
            }

            res.json(health);
        });

        // Metrics endpoint
        if (metricsCollector) {
            app.get('/metrics', (req, res) => {
                res.json(metricsCollector.getMetrics());
            });
        }

        // OAuth discovery endpoints (per MCP spec 2025-06-18)
        if (oauthProvider) {
            app.get('/.well-known/oauth-authorization-server', (req, res) => {
                res.json(oauthProvider.getAuthorizationServerMetadata());
            });

            app.get('/.well-known/oauth-protected-resource', (req, res) => {
                res.json(oauthProvider.getResourceServerMetadata());
            });

            app.post('/oauth/token', async (req, res) => {
                try {
                    const token = await oauthProvider.handleTokenRequest(req.body);
                    res.json(token);
                } catch (error) {
                    logger.error('OAuth token error:', error);
                    res.status(400).json({
                        error: 'invalid_request',
                        error_description: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            });

            // OAuth middleware for protected endpoints
            app.use('/mcp', async (req, res, next) => {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return res.status(401).json({ error: 'Missing or invalid authorization header' });
                }

                const token = authHeader.substring(7);
                if (!oauthProvider.validateToken(token, config.baseUrl)) {
                    return res.status(401).json({ error: 'Invalid or expired token' });
                }

                next();
            });
        }

        // MCP SSE endpoint
        app.get('/mcp/sse', async (req, res) => {
            const sessionId = sessionManager.createSession();
            logger.info(`SSE connection established: ${sessionId}`);

            const transport = new SSEServerTransport('/mcp/message', res);

            await mcpServer.connect(transport);

            // Store session
            sessionManager.registerSession(sessionId, transport);

            req.on('close', () => {
                logger.info(`SSE connection closed: ${sessionId}`);
                sessionManager.deleteSession(sessionId);
                transport.close();
            });
        });

        // MCP message endpoint
        app.post('/mcp/message', async (req, res) => {
            try {
                const sessionId = req.headers['mcp-session-id'] as string;

                if (!sessionId) {
                    return res.status(400).json({ error: 'Missing mcp-session-id header' });
                }

                const session = sessionManager.getSession(sessionId);
                if (!session) {
                    return res.status(404).json({ error: 'Session not found' });
                }

                // Message handling is done by the transport
                res.status(202).json({ received: true });
            } catch (error) {
                logger.error('Error handling MCP message:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Start session cleanup
        sessionManager.startCleanupInterval();

        // Start HTTP server
        const port = config.port;
        httpServer = app.listen(port, () => {
            logger.info(`Claude Code MCP Server running on http://localhost:${port}`);
            logger.info(`SSE endpoint: http://localhost:${port}/mcp/sse`);
            logger.info(`Health check: http://localhost:${port}/health`);
            if (config.oauth.enabled) {
                logger.info(`OAuth discovery: http://localhost:${port}/.well-known/oauth-authorization-server`);
            }
        });
    }
}

main().catch((error) => {
    logger.error('Server error:', error);
    process.exit(1);
});