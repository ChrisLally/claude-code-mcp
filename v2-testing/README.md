# Claude Code MCP Server v2.0

> **Production-Ready MCP Server** for Claude Code CLI integration with TypeScript, OAuth 2.1, SSE Transport, Subagents, Hooks, Checkpoints, Background Tasks, Plugins, Rate Limiting, Metrics, and Webhooks

A **comprehensive, enterprise-grade MCP server** that wraps Claude Code CLI functionality with full support for the latest MCP specifications (2025-03-26, 2025-06-18) and all Claude Code features released through October 2025.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4%2B-blue)](https://www.typescriptlang.org/)

---

## 🚀 What's New in v2.0

### Architecture
- **✨ Full TypeScript** - Complete type safety with strict mode
- **🌐 SSE Transport** - Server-Sent Events for remote deployment per MCP 2025-03-26
- **🔐 OAuth 2.1** - PKCE + Resource Indicators (RFC 8707) implementation
- **📡 Dual Mode** - Works as both stdio (local) and SSE (remote) server

### Claude Code Features (Sept-Oct 2025)
- **🤖 Subagents** - Delegate to specialized AI assistants
- **🎣 Hooks** - Automated workflow actions (8 hook types)
- **⏮️ Checkpoints** - Create, restore, compare, and delete session states
- **🧠 Extended Thinking** - think/think-hard/think-harder/ultrathink modes
- **⚙️ Background Tasks** - Long-running operations (dev servers, watchers)
- **📦 Plugin System** - Install and manage Claude Code plugins

### Production Features (v2.1.0)
- **⚡ Rate Limiting** - Per-client token bucket rate limiter
- **📊 Metrics** - Prometheus-compatible metrics endpoint
- **🪝 Webhooks** - Event notifications with retry logic
- **🔄 Session Management** - Automatic cleanup and lifecycle management
- **🛡️ Error Handling** - Comprehensive custom error types
- **📝 Structured Logging** - Configurable log levels with context

---

## 📋 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Available Tools](#-available-tools)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [API Reference](#-api-reference)
- [Security](#-security)
- [Development](#-development)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Features

### Core MCP Tools

| Tool | Description | Features |
|------|-------------|----------|
| `claude_ask` | Full-featured interaction | Subagents, hooks, thinking modes, background tasks |
| `claude_plan` | Read-only planning mode | TodoRead/TodoWrite, exit_plan_mode |
| `claude_resume` | Resume sessions | Full context preservation |
| `claude_checkpoint` | State management | Create, list, restore, compare, delete |
| `claude_subagent_list` | List subagents | Project + user + plugin subagents |
| `claude_plugin_list` | List plugins | User and project scope |
| `claude_plugin_install` | Install plugins | Scoped installation |
| `claude_background_tasks` | Manage tasks | List, stop, logs, restart |
| `claude_abort` | Abort operations | Sessions or background tasks |

### Transport Modes

#### Stdio (Local Development)
```bash
TRANSPORT=stdio npm start
# Perfect for Claude Desktop integration
```

#### SSE (Remote Production)
```bash
TRANSPORT=sse npm start
# Production-ready with OAuth, rate limiting, metrics
# Server at http://localhost:3000
```

### Authentication & Security

- **OAuth 2.1** with PKCE (RFC 7636)
- **Resource Indicators** (RFC 8707) for token audience binding
- **Rate Limiting** with configurable windows and limits
- **Per-client** tracking and enforcement
- **Discovery endpoints** (`.well-known/*`)

### Monitoring & Observability

- **Metrics Collection** - Request counts, response times, error rates
- **Prometheus Export** - `/metrics` endpoint
- **Webhook Notifications** - Real-time event streaming
- **Structured Logging** - JSON output with configurable levels
- **Health Checks** - `/health` endpoint with diagnostics

---

## 📦 Installation

### Prerequisites

- **Node.js** >= 18.0.0
- **Claude Code CLI** installed and in PATH
- **pnpm** or npm

### Install

```bash
git clone https://github.com/ChrisLally/claude-code-mcp
cd claude-code-mcp

pnpm install
pnpm build
```

---

## 🏃 Quick Start

### 1. Local Development (Stdio)

```bash
# Configure
cp .env.example .env
# Edit: TRANSPORT=stdio, LOG_LEVEL=debug

# Start
pnpm start:stdio
```

**Claude Desktop config:**
```json
{
  "mcpServers": {
    "claude-code": {
      "command": "node",
      "args": ["/path/to/claude-code-mcp/build/server/index.js"],
      "env": {
        "TRANSPORT": "stdio",
        "DEFAULT_WORKING_DIRECTORY": "/your/project"
      }
    }
  }
}
```

### 2. Remote Deployment (SSE + OAuth)

```bash
# Configure
TRANSPORT=sse
PORT=3000
BASE_URL=https://your-server.com
OAUTH_ENABLED=true
OAUTH_CLIENT_ID=mcp_$(openssl rand -hex 16)
OAUTH_CLIENT_SECRET=$(openssl rand -hex 32)
METRICS_ENABLED=true
WEBHOOKS_ENABLED=true
WEBHOOK_URL=https://monitoring.com/webhooks

# Start
pnpm start:sse
```

**Connect from MCP client:**
```json
{
  "mcpServers": {
    "claude-code-remote": {
      "transport": "sse",
      "url": "https://your-server.com/mcp/sse",
      "auth": {
        "type": "oauth",
        "clientId": "your-client-id",
        "tokenEndpoint": "https://your-server.com/oauth/token"
      }
    }
  }
}
```

---

## 🛠 Available Tools

### `claude_ask` - Full-Featured Interaction

```typescript
{
  "query": "Refactor this component with the code-reviewer subagent",
  "sessionId": "optional-session-id",
  "model": "claude-sonnet-4-5-20250929",
  "subagent": "code-reviewer",
  "thinkingLevel": "think-harder",
  "allowedTools": ["Read", "Write", "Edit"],
  "disallowedTools": ["Bash"],
  "hooks": {
    "preToolUse": ".claude/hooks/security-check.js",
    "postToolUse": ".claude/hooks/log-changes.js",
    "onError": ".claude/hooks/notify-error.js"
  },
  "backgroundTask": false,
  "priority": "high",
  "workingDirectory": "/project"
}
```

**Features:**
- Subagent delegation with `@subagent-name` syntax
- Extended thinking modes (think → ultrathink)
- 5 hook types (preToolUse, postToolUse, sessionStart, preCompact, onError)
- Background task support for long-running ops
- Priority levels (low, normal, high)

### `claude_plan` - Strategic Planning

```typescript
{
  "query": "Analyze auth system and plan OAuth2 migration",
  "sessionId": "planning-abc123",
  "model": "sonnet",
  "workingDirectory": "/project"
}
```

**Auto-includes:** Read, Task, TodoRead, TodoWrite, exit_plan_mode tools

### `claude_checkpoint` - State Management

```typescript
// Create
{
  "action": "create",
  "sessionId": "session-123",
  "label": "Before major refactor"
}

// List
{ "action": "list", "sessionId": "session-123" }

// Restore
{
  "action": "restore",
  "sessionId": "session-123",
  "checkpointId": "checkpoint_1234567890"
}

// Compare
{
  "action": "compare",
  "sessionId": "session-123",
  "checkpointId": "checkpoint_123",
  "compareWith": "checkpoint_456"
}

// Delete
{
  "action": "delete",
  "sessionId": "session-123",
  "checkpointId": "checkpoint_789"
}
```

### `claude_background_tasks` - Task Management

```typescript
// List tasks
{ "action": "list" }

// Stop task
{ "action": "stop", "taskId": "task_abc123" }

// View logs
{ "action": "logs", "taskId": "task_abc123" }

// Restart task
{ "action": "restart", "taskId": "task_abc123" }
```

### `claude_plugin_install` - Plugin Management

```typescript
{
  "plugin": "github.com/user/claude-plugin",
  "scope": "user"  // or "project"
}
```

---

## ⚙️ Configuration

### Environment Variables

See `.env.example` for all options. Key variables:

```bash
# Core
TRANSPORT=sse                    # stdio | sse
PORT=3000
BASE_URL=http://localhost:3000

# Claude
DEFAULT_WORKING_DIRECTORY=/workspace
DEFAULT_ALLOWED_TOOLS=Read,Write,Edit

# OAuth
OAUTH_ENABLED=true
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-secret

# Performance
MAX_CONCURRENT_SESSIONS=100
SESSION_TIMEOUT_MS=86400000      # 24 hours

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes

# Monitoring
METRICS_ENABLED=true
WEBHOOKS_ENABLED=true
WEBHOOK_URL=https://webhooks.example.com

# Logging
LOG_LEVEL=info                   # debug|info|warn|error
```

---

## 🌐 Deployment

### Railway

```bash
railway init
railway up

# Set vars
railway variables set TRANSPORT=sse
railway variables set OAUTH_ENABLED=true
```

### Koyeb

```bash
koyeb app init claude-code-mcp \
  --git https://github.com/your/repo \
  --ports 3000:http \
  --env TRANSPORT=sse \
  --env OAUTH_ENABLED=true \
  --min-scale 0 \
  --max-scale 3
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN npm install -g @anthropic-ai/claude-code pnpm
COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY build ./build
ENV TRANSPORT=sse PORT=3000
EXPOSE 3000
CMD ["node", "build/server/index.js"]
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for Cloudflare, AWS Lambda, GCP Cloud Run, and more.

---

## 📚 API Reference

### Endpoints

```
GET  /health                        - Health check + metrics
GET  /metrics                       - Prometheus metrics
GET  /mcp/sse                       - MCP SSE connection
POST /mcp/message                   - MCP message handler
GET  /.well-known/oauth-*           - OAuth discovery
POST /oauth/token                   - OAuth token endpoint
```

### Health Response

```json
{
  "status": "healthy",
  "version": "2.0.0",
  "uptime": 3600,
  "activeSessions": 5,
  "transport": "sse",
  "metrics": {
    "totalRequests": 150,
    "successfulRequests": 145,
    "failedRequests": 5,
    "averageResponseTime": 234
  }
}
```

### Metrics (Prometheus)

```
# HELP mcp_requests_total Total requests
# TYPE mcp_requests_total counter
mcp_requests_total 150

# HELP mcp_response_time_ms Average response time
# TYPE mcp_response_time_ms gauge
mcp_response_time_ms 234

# Per-tool metrics
mcp_tool_calls_total{tool="claude_ask"} 100
mcp_tool_avg_time_ms{tool="claude_ask"} 350
mcp_tool_error_rate{tool="claude_ask"} 2.5
```

### Webhook Events

```typescript
{
  "event": "tool.completed",
  "tool": "claude_ask",
  "duration": 234,
  "timestamp": "2025-10-30T10:30:00.000Z"
}

// Available events:
// - tool.called, tool.completed, tool.error
// - session.started, session.ended
// - checkpoint.created, checkpoint.restored
// - background_task.started/completed/failed
// - rate_limit.exceeded
// - server.started, server.shutdown
```

---

## 🔒 Security

### OAuth 2.1 Flow

1. **Client** initiates auth with PKCE challenge
2. **Server** validates and stores challenge
3. **Client** exchanges code + verifier for token
4. **Server** validates PKCE, issues audience-bound token
5. **Client** uses Bearer token with Resource Indicator

### Security Checklist

- [x] PKCE (RFC 7636) - Prevents auth code interception
- [x] Resource Indicators (RFC 8707) - Token audience binding
- [x] No token passthrough - Server-side validation only
- [x] Rate limiting - Prevents abuse
- [x] Session timeout - Auto-cleanup stale sessions
- [x] HTTPS required - Production deployments
- [x] Structured logging - Security audit trail

### Known Risks

⚠️ **Prompt Injection** - Claude Code is susceptible. Validate user inputs.  
⚠️ **Tool Access** - `Bash` and `Write` can execute code. Use allowedTools carefully.  
⚠️ **Background Tasks** - Can persist after session ends. Monitor actively.

---

## 🧑‍💻 Development

### Project Structure

```
claude-code-mcp/
├── server/
│   ├── index.ts                 # Main MCP server
│   ├── claude-executor.ts       # Claude CLI wrapper
│   ├── types.ts                 # TypeScript definitions
│   ├── session-manager.ts       # SSE session management
│   ├── auth/
│   │   └── oauth-provider.ts    # OAuth 2.1 implementation
│   └── utils/
│       ├── logger.ts            # Structured logging
│       ├── pkce.ts              # PKCE utilities
│       ├── errors.ts            # Custom errors
│       ├── rate-limiter.ts      # Rate limiting
│       ├── metrics.ts           # Metrics collection
│       └── webhooks.ts          # Webhook manager
├── build/                       # Compiled output
├── package.json
├── tsconfig.json
├── .eslintrc.json
└── .env.example
```

### Scripts

```bash
pnpm dev           # Watch mode
pnpm build         # Compile TypeScript
pnpm start         # Run compiled server
pnpm type-check    # Type checking
pnpm lint          # ESLint
pnpm lint:fix      # Auto-fix
pnpm clean         # Remove build/
```

### Adding Features

1. Define types in `server/types.ts`
2. Add tool definition in `server/index.ts`
3. Implement in `server/claude-executor.ts`
4. Add tests
5. Update documentation

---

## 🐛 Troubleshooting

### "Claude command not found"

```bash
# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Verify
claude --version
```

### OAuth Discovery Fails

```bash
# Test endpoints
curl http://localhost:3000/.well-known/oauth-authorization-server
curl http://localhost:3000/.well-known/oauth-protected-resource
```

### Rate Limit Exceeded

```bash
# Check status
curl http://localhost:3000/health | jq '.metrics'

# Adjust limits
export RATE_LIMIT_REQUESTS=200
export RATE_LIMIT_WINDOW_MS=900000
```

### High Memory Usage

```bash
# Enable cleanup
export SESSION_TIMEOUT_MS=3600000  # 1 hour

# Reduce max sessions
export MAX_CONCURRENT_SESSIONS=50
```

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and upgrade notes.

**v2.0.0** (2025-10-30) - Complete rewrite with:
- TypeScript, SSE transport, OAuth 2.1
- Subagents, hooks, checkpoints, background tasks
- Rate limiting, metrics, webhooks
- Plugin system support

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing`
5. Open Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Christopher Lally**
- GitHub: [@ChrisLally](https://github.com/ChrisLally)
- Website: [christopherlally.com](https://christopherlally.com)

---

## 🙏 Acknowledgments

- Anthropic for Claude Code and MCP specification
- MCP community for protocol development
- Contributors and users

---

<div align="center">
  <strong>Production-grade agentic development infrastructure</strong>
  <br/>
  <sub>Built with ❤️ using TypeScript, MCP, and Claude Code</sub>
</div>