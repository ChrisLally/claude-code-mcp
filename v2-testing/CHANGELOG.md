# Changelog

All notable changes to the Claude Code MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-10-30

### 🎉 Major Release - Complete Rewrite

This is a ground-up rewrite of the Claude Code MCP Server with modern architecture, TypeScript, OAuth 2.1, and support for all latest Claude Code features.

### Added

#### Core Features
- **TypeScript Implementation** - Complete rewrite in TypeScript for type safety and better developer experience
- **Remote Transport Support** - Streamable HTTP transport per MCP specification 2025-03-26
- **OAuth 2.1 Authentication** - Full OAuth 2.1 implementation with PKCE and Resource Indicators (RFC 8707)
- **Dual Transport Mode** - Support for both stdio (local) and HTTP (remote) transports

#### Claude Code Features
- **Subagent Support** - Delegate tasks to specialized AI assistants
- **Hook Integration** - Support for pre-tool-use, post-tool-use, session-start, and pre-compact hooks
- **Checkpoint Management** - Create, list, and restore session checkpoints
- **Extended Thinking Modes** - Support for think, think-hard, think-harder, and ultrathink modes
- **Model Selection** - Configure specific Claude models including claude-sonnet-4-5-20250929

#### New Tools
- `claude_checkpoint` - Manage session checkpoints (create, list, restore)
- `claude_subagent_list` - List available subagents (project and user level)

#### Developer Experience
- **Structured Logging** - Comprehensive logging with configurable levels (debug, info, warn, error)
- **Session Management** - Stateful HTTP sessions with automatic cleanup
- **Health Endpoints** - `/health` endpoint for monitoring
- **OAuth Discovery** - Standard `/.well-known/*` endpoints per RFC 8414

#### Documentation
- **Comprehensive README** - Complete guide with examples for all features
- **Deployment Guide** - Detailed instructions for Cloudflare, Railway, Koyeb, AWS, GCP
- **Migration Guide** - Clear path from v1.x to v2.0
- **Security Documentation** - OAuth best practices and security considerations

### Changed

#### Breaking Changes
- **Language**: Migrated from JavaScript to TypeScript
- **Transport**: Upgraded from HTTP+SSE to Streamable HTTP
- **Authentication**: Enhanced from basic auth to OAuth 2.1 with PKCE
- **Configuration**: Moved from hardcoded config to environment variables
- **Build Output**: Changed from `server/` to `build/server/` directory

#### Enhanced Tools
- `claude_ask` - Added subagent, thinkingLevel, hooks, model parameters
- `claude_plan` - Updated with correct plan mode tool set (Read, Task, TodoRead, TodoWrite, exit_plan_mode)
- `claude_resume` - Enhanced with better context preservation

#### Improvements
- **Error Handling** - Comprehensive error handling with detailed error messages
- **Performance** - Better session lifecycle management and cleanup
- **Security** - Token audience binding, PKCE validation, no token passthrough
- **Scalability** - Support for serverless platforms with scale-to-zero

### Security

#### Implemented
- OAuth 2.1 with PKCE (RFC 7636)
- Resource Indicators (RFC 8707) for token audience binding
- OAuth discovery endpoints per RFC 8414
- Secure session management with automatic cleanup
- Configurable tool permissions (allowedTools/disallowedTools)

#### Fixed
- Eliminated token passthrough vulnerability
- Added server-side token validation
- Implemented proper PKCE challenge verification
- Added resource binding to prevent token misuse

### Dependencies

#### Added
- `@modelcontextprotocol/sdk` ^1.10.0 - MCP TypeScript SDK with Streamable HTTP support
- `express` ^4.19.2 - HTTP server framework
- `zod` ^3.23.8 - Schema validation
- `tsx` ^4.15.0 - TypeScript execution for development
- `typescript` ^5.4.5 - TypeScript compiler

#### Updated
- Node.js requirement: >=18.0.0 (from >=16.0.0)

### Removed

#### Deprecated
- Legacy HTTP+SSE transport (replaced by Streamable HTTP)
- Hardcoded server configuration (replaced by environment variables)
- `claude-cli.js` (replaced by `claude-executor.ts`)
- Direct localStorage usage (not applicable for server)

### Migration Notes

Users upgrading from v1.x should:

1. Install TypeScript dependencies: `pnpm install`
2. Build the project: `pnpm build`
3. Update configuration to use environment variables (see `.env.example`)
4. Update MCP client config to use `build/server/index.js` instead of `server/index.js`
5. For HTTP transport, configure OAuth credentials
6. Review tool parameter changes (added: subagent, thinkingLevel, hooks, model)

See [Migration Guide](README.md#migration-from-v1x) for detailed instructions.

---

## [1.0.4] - 2024-XX-XX

### Added
- Initial release with JavaScript implementation
- Basic stdio transport support
- Three core tools: claude_ask, claude_plan, claude_resume
- Session management with resume capability
- Claude Desktop Extension support (.dxt packaging)
- MCP server for local Claude Desktop integration

### Features
- Execute Claude Code CLI commands via MCP
- Session tracking and resumption
- Working directory configuration
- Tool permission management (allowedTools)
- Plan mode for read-only operations

### Known Limitations
- No remote transport support
- No OAuth authentication
- Basic session management
- No subagent support
- No hook support
- No checkpoint management
- Limited error handling
- JavaScript without type safety

---

## [Unreleased]

### Planned for 2.1.0
- [ ] Background task management
- [ ] Plugin system integration
- [ ] Improved checkpoint system with diff viewing
- [ ] Webhook support for hook events
- [ ] Real-time session monitoring dashboard
- [ ] Multi-model support (Claude 3.5, 4, etc.)
- [ ] Rate limiting per client
- [ ] Request queuing system
- [ ] Metrics and analytics

### Under Consideration
- GraphQL API layer
- gRPC transport option
- Native WebSocket support for real-time updates
- Built-in CI/CD integration
- Team collaboration features
- Advanced caching strategies
- Redis session store option

---

## Version History

- **2.0.0** (2025-10-30) - Major rewrite with TypeScript, OAuth 2.1, remote transport
- **1.0.4** (2024-XX-XX) - Initial JavaScript release
- **1.0.0** (2024-XX-XX) - First public release

---

## Deprecation Notices

### Deprecated in 2.0.0
- HTTP+SSE transport (use Streamable HTTP instead)
- Hardcoded configuration (use environment variables)
- Direct file-based configuration

### Removed in 2.0.0
- `server/claude-cli.js` (replaced by `server/claude-executor.ts`)
- Legacy MCP session storage

---

## Upgrade Paths

### From 1.0.x to 2.0.0

**Risk Level**: Medium (breaking changes but backward-compatible tool APIs)

**Required Actions**:
1. Install new dependencies
2. Rebuild with TypeScript
3. Update configuration to environment variables
4. Update MCP client config paths
5. Test OAuth flow if using remote transport

**Estimated Time**: 15-30 minutes

**Backward Compatibility**: Tool APIs are mostly compatible, but transport and auth are completely new.

---

## Support

For questions or issues:
- 📖 [Documentation](README.md)
- 🐛 [Report Issues](https://github.com/ChrisLally/claude-code-mcp/issues)
- 💬 [Discussions](https://github.com/ChrisLally/claude-code-mcp/discussions)

---

**Note**: This project follows [Semantic Versioning](https://semver.org/). Given a version number MAJOR.MINOR.PATCH:
- MAJOR version changes indicate incompatible API changes
- MINOR version adds functionality in a backward compatible manner
- PATCH version makes backward compatible bug fixes