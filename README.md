# Claude Code MCP Integration

A **dual-purpose** solution that works both as a **standalone MCP server** and a **Claude Desktop Extension**. This project wraps Claude Code CLI functionality, enabling other AI systems to interact with Claude Code through standardized MCP tools.

## 🚀 Features

### Core Functionality
- **🤖 claude_ask** - Ask Claude Code CLI questions with full tool access and session management
- **📋 claude_plan** - Request planning assistance using read-only mode with planning tools  
- **🔄 claude_resume** - Resume previous Claude Code sessions with full context preservation

### Deployment Flexibility
- **📱 Desktop Extension** - One-click installation in Claude Desktop with UI configuration
- **🔧 Standalone MCP Server** - Works with any MCP-compatible client or custom application
- **⚡ Claude CLI Integration** - Built-in MCP support through Claude Code's native MCP system

### Technical Features
- **🎯 Cross-platform** - Works on macOS, Windows, and Linux
- **⚙️ Configurable** - User-friendly configuration (Extension) or programmatic setup (MCP)
- **🔄 Backward Compatible** - Same server code works in all deployment modes

## 📦 Installation

> **Choose Your Deployment Mode**: This project works in multiple ways depending on your needs.

### Option 1: Claude Desktop Extension (Recommended for End Users)

**Best for**: Claude Desktop users who want easy installation and UI configuration

1. **Download**: Get the latest `claude-code.dxt` from [releases](https://github.com/ChrisLally/claude-code-mcp/releases)
2. **Install**: Open Claude Desktop → Settings → Extensions → "Install Extension"
3. **Configure**: Set your preferred working directory and allowed tools
4. **Start using**: Claude Code tools are now available in your conversations!

**Configuration Options:**
- **Default Working Directory**: Choose where Claude Code operations run
- **Default Allowed Tools**: Specify which tools Claude can use (Leave empty for all tools)

### Option 2: Standalone MCP Server (For Custom Applications)

**Best for**: Developers building custom MCP clients or integrating with other AI systems

```bash
# Clone and install
git clone https://github.com/ChrisLally/claude-code-mcp
cd claude-code-mcp
pnpm install

# Use with any MCP-compatible client
{
  "mcpServers": {
    "claude-code": {
      "command": "node", 
      "args": ["/path/to/claude-code-mcp/server/index.js"]
    }
  }
}
```

**Use cases:**
- Custom AI applications requiring Claude Code integration
- Multi-client MCP deployments
- Development and testing environments
- Integration with non-Claude AI systems

### Option 3: Claude CLI MCP Integration (For Claude Code Power Users)

**Best for**: Existing Claude Code users who want MCP functionality

```bash
claude mcp add claude-code node /path/to/claude-code-mcp/server/index.js
```

**Benefits:**
- Leverages Claude Code's native MCP support
- Seamless integration with existing Claude workflows
- No additional configuration needed

## 🛠 Usage

### Available Tools

#### `claude_ask`
**Full-featured Claude Code interaction with complete tool access**

```javascript
{
  "query": "Help me refactor this React component",
  "sessionId": "optional-session-id", 
  "allowedTools": ["Read", "Write", "Edit", "Bash"], // Optional: limit tools
  "workingDirectory": "/path/to/project" // Optional: set working directory
}
```

**Use cases:**
- Code reviews and refactoring
- Bug fixes and debugging  
- Feature implementation
- Architecture discussions

#### `claude_plan`
**Strategic planning and analysis in read-only mode**

```javascript
{
  "query": "Analyze this codebase and create an implementation plan for adding authentication",
  "sessionId": "optional-planning-session",
  "workingDirectory": "/path/to/analyze"
}
```

**Use cases:**
- Codebase analysis
- Implementation planning
- Architecture review
- Technical documentation

#### `claude_resume`
**Continue previous conversations with full context**

```javascript
{
  "sessionId": "session-to-resume",
  "query": "Let's continue with the database integration", // Optional
  "workingDirectory": "/path/to/project"
}
```

**Use cases:**
- Long-running development sessions
- Picking up where you left off
- Collaborative development workflows

## 📋 Requirements

- **Node.js** 18.0.0 or higher
- **Claude Code CLI** installed and available in PATH
- **Operating System**: macOS, Windows, or Linux

## 🔧 Development

### Building the Extension

```bash
# Install dependencies
pnpm install

# Build the .dxt extension file
npm run build-extension

# The extension will be created at dist/claude-code.dxt
```

### Development Scripts

```bash
# Start development server with inspection
npm run dev

# Run the server normally  
npm start

# Clean and rebuild extension
npm run build:clean && npm run build:package
```

### Project Structure

```
claude-code-mcp/
├── manifest.json           # Desktop Extension configuration
├── server/                 # MCP server implementation
│   ├── index.js           # Main MCP server
│   └── claude-cli.js      # Claude Code CLI wrapper
├── package.json           # Node.js package configuration
├── README.md             # This file
└── dist/                 # Built extension files
    └── claude-code.dxt   # Packaged extension
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

## 📝 Examples

### Basic Code Review
```javascript
// Using claude_ask
{
  "query": "Review this function for performance issues and suggest improvements",
  "workingDirectory": "/my/project",
  "allowedTools": ["Read", "Grep"]
}
```

### Project Planning
```javascript
// Using claude_plan
{
  "query": "Analyze the current authentication system and plan migration to OAuth2",
  "workingDirectory": "/my/project"
}
```

### Session Continuation
```javascript
// Using claude_resume
{
  "sessionId": "abc123-def456",
  "query": "Now let's implement the database changes we discussed"
}
```

## 🐛 Troubleshooting

**Extension not appearing in Claude Desktop?**
- Ensure the `.dxt` file is valid (try rebuilding with `npm run build-extension`)
- Check Claude Desktop version compatibility (requires >=1.0.0)

**"Claude command not found" errors?**
- Verify Claude Code CLI is installed and in your PATH
- Try running `claude --version` in terminal

**Permission errors?**
- Check that the working directory exists and is accessible
- Verify Node.js has appropriate file system permissions

**Tool access issues?**
- Review your `defaultAllowedTools` configuration
- Some tools may require specific permissions or environment setup

## 📊 Compatibility

| Platform | Status | Notes |
|----------|--------|-------|
| macOS    | ✅ Supported | Full feature support |
| Windows  | ✅ Supported | Full feature support |
| Linux    | ✅ Supported | Full feature support |

| Runtime | Version | Status |
|---------|---------|--------|
| Node.js | >=18.0.0 | ✅ Required |
| Claude Desktop | >=1.0.0 | ✅ Required for extensions |

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 👤 Author

**Christopher Lally**
- GitHub: [@ChrisLally](https://github.com/ChrisLally)
- Website: [christopherlally.com](https://christopherlally.com)

## 🔗 Links

- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Desktop Extensions Guide](https://www.anthropic.com/engineering/desktop-extensions)

---

<div align="center">
  <strong>Integrating Claude Code's powerful development capabilities into your AI workflows</strong>
</div>