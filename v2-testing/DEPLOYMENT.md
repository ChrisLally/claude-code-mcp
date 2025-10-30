# Deployment Guide

This guide covers deploying the Claude Code MCP Server to various hosting platforms with OAuth authentication and remote transport.

## Table of Contents

- [Platform Overview](#platform-overview)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Cloudflare Workers](#cloudflare-workers)
- [Railway](#railway)
- [Koyeb](#koyeb)
- [AWS Lambda](#aws-lambda)
- [Google Cloud Run](#google-cloud-run)
- [Docker](#docker-deployment)
- [OAuth Setup](#oauth-setup)
- [Monitoring & Logging](#monitoring--logging)

---

## Platform Overview

| Platform | Scale-to-Zero | WebSocket | Price (Est.) | Best For |
|----------|---------------|-----------|--------------|----------|
| Cloudflare Workers | ✅ Yes | ❌ No | $5-20/mo | Global edge deployment |
| Railway | ❌ No | ✅ Yes | $5-50/mo | Simple deployment |
| Koyeb | ✅ Yes | ✅ Yes | $0-20/mo | Free tier, auto-scaling |
| AWS Lambda | ✅ Yes | ⚠️ Limited | $0-30/mo | AWS ecosystem |
| Google Cloud Run | ✅ Yes | ✅ Yes | $0-25/mo | GCP ecosystem |
| Docker/VPS | ❌ No | ✅ Yes | $5-100/mo | Full control |

---

## Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] Node.js 18+ installed locally
- [ ] Project built successfully (`pnpm build`)
- [ ] Environment variables configured
- [ ] OAuth client credentials (for production)
- [ ] Domain name (optional, recommended for OAuth)
- [ ] SSL certificate (handled by platform usually)

### Required Environment Variables

```bash
# Minimum required for remote deployment
TRANSPORT=http
PORT=3000
BASE_URL=https://your-domain.com
OAUTH_ENABLED=true
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-secret
DEFAULT_WORKING_DIRECTORY=/workspace
```

---

## Cloudflare Workers

### Setup

1. **Install Wrangler**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. **Create `wrangler.toml`**
   ```toml
   name = "claude-code-mcp"
   main = "build/server/index.js"
   compatibility_date = "2025-10-01"
   node_compat = true

   [vars]
   TRANSPORT = "http"
   PORT = "8787"
   OAUTH_ENABLED = "true"
   LOG_LEVEL = "info"

   # Add secrets separately (don't commit these!)
   # wrangler secret put OAUTH_CLIENT_SECRET
   # wrangler secret put ANTHROPIC_API_KEY
   ```

3. **Deploy**
   ```bash
   pnpm build
   wrangler deploy
   ```

4. **Set Secrets**
   ```bash
   wrangler secret put OAUTH_CLIENT_SECRET
   wrangler secret put OAUTH_CLIENT_ID
   ```

5. **Get URL**
   ```bash
   # Cloudflare provides: https://claude-code-mcp.your-subdomain.workers.dev
   ```

### Cloudflare-Specific Notes

- Workers have 50ms CPU limit per request (fine for MCP)
- Use Durable Objects for stateful sessions (optional enhancement)
- KV storage for token persistence (optional)

---

## Railway

### Setup

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Create `railway.toml`**
   ```toml
   [build]
   builder = "NIXPACKS"
   buildCommand = "pnpm install && pnpm build"

   [deploy]
   startCommand = "node build/server/index.js"
   restartPolicyType = "ON_FAILURE"
   ```

3. **Deploy**
   ```bash
   railway init
   railway up
   ```

4. **Set Environment Variables**
   ```bash
   railway variables set TRANSPORT=http
   railway variables set PORT=3000
   railway variables set OAUTH_ENABLED=true
   railway variables set OAUTH_CLIENT_ID=your-id
   railway variables set OAUTH_CLIENT_SECRET=your-secret
   ```

5. **Get Domain**
   ```bash
   railway domain
   # Creates: https://your-app.up.railway.app
   ```

### Railway-Specific Notes

- Always-on (no scale-to-zero)
- $5/month minimum with generous free tier
- Automatic SSL certificates
- Easy GitHub integration

---

## Koyeb

### Setup

1. **Install Koyeb CLI**
   ```bash
   curl -fsSL https://cli.koyeb.com/install.sh | sh
   koyeb login
   ```

2. **Create Deployment**
   ```bash
   koyeb app init claude-code-mcp \
     --git https://github.com/your-username/claude-code-mcp \
     --git-branch main \
     --git-build-command "pnpm install && pnpm build" \
     --git-run-command "node build/server/index.js" \
     --ports 3000:http \
     --routes /:3000 \
     --env TRANSPORT=http \
     --env PORT=3000 \
     --env OAUTH_ENABLED=true \
     --instance-type free \
     --regions was \
     --min-scale 0 \
     --max-scale 1
   ```

3. **Set Secrets**
   ```bash
   koyeb secret create oauth-client-id --value "your-client-id"
   koyeb secret create oauth-client-secret --value "your-secret"
   
   # Use secrets in deployment
   koyeb service update claude-code-mcp \
     --env OAUTH_CLIENT_ID=@oauth-client-id \
     --env OAUTH_CLIENT_SECRET=@oauth-client-secret
   ```

4. **Get URL**
   ```bash
   koyeb service get claude-code-mcp
   # URL: https://claude-code-mcp-your-org.koyeb.app
   ```

### Koyeb-Specific Notes

- Free tier available with scale-to-zero
- Automatic HTTPS
- Built-in health checks
- Great for cost-effective production

---

## AWS Lambda

### Setup with Serverless Framework

1. **Install Serverless**
   ```bash
   npm install -g serverless
   ```

2. **Create `serverless.yml`**
   ```yaml
   service: claude-code-mcp
   
   provider:
     name: aws
     runtime: nodejs20.x
     region: us-east-1
     environment:
       TRANSPORT: http
       OAUTH_ENABLED: true
       OAUTH_CLIENT_ID: ${env:OAUTH_CLIENT_ID}
       OAUTH_CLIENT_SECRET: ${env:OAUTH_CLIENT_SECRET}
   
   functions:
     api:
       handler: build/server/index.handler
       events:
         - httpApi:
             path: /{proxy+}
             method: ANY
       timeout: 30
       memorySize: 512
   ```

3. **Create Lambda Handler Wrapper**
   
   Create `server/lambda.ts`:
   ```typescript
   import serverlessExpress from '@vendia/serverless-express';
   import { app } from './index.js'; // Export your express app
   
   export const handler = serverlessExpress({ app });
   ```

4. **Deploy**
   ```bash
   serverless deploy
   ```

### AWS Lambda Notes

- Cold starts (~500ms) acceptable for MCP
- 15min max timeout (sufficient)
- Use API Gateway for HTTP endpoint
- Consider DynamoDB for session storage

---

## Google Cloud Run

### Setup

1. **Install gcloud CLI**
   ```bash
   curl https://sdk.cloud.google.com | bash
   gcloud auth login
   gcloud config set project your-project-id
   ```

2. **Create `cloudbuild.yaml`**
   ```yaml
   steps:
     - name: 'gcr.io/cloud-builders/npm'
       args: ['install']
     - name: 'gcr.io/cloud-builders/npm'
       args: ['run', 'build']
   
   images:
     - 'gcr.io/$PROJECT_ID/claude-code-mcp'
   ```

3. **Create `Dockerfile`** (see Docker section below)

4. **Deploy**
   ```bash
   gcloud builds submit --tag gcr.io/your-project/claude-code-mcp
   
   gcloud run deploy claude-code-mcp \
     --image gcr.io/your-project/claude-code-mcp \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 3000 \
     --set-env-vars "TRANSPORT=http,OAUTH_ENABLED=true" \
     --set-secrets "OAUTH_CLIENT_SECRET=oauth-secret:latest" \
     --min-instances 0 \
     --max-instances 10
   ```

5. **Get URL**
   ```bash
   gcloud run services describe claude-code-mcp --format 'value(status.url)'
   ```

### Cloud Run Notes

- Excellent scale-to-zero
- 60s request timeout (configurable)
- Generous free tier
- Built-in load balancing

---

## Docker Deployment

### Dockerfile

```dockerfile
# Use Node.js 20 Alpine for smaller image
FROM node:20-alpine

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile --prod

# Copy built application
COPY build ./build

# Create workspace directory
RUN mkdir -p /workspace

# Set environment
ENV NODE_ENV=production
ENV TRANSPORT=http
ENV PORT=3000
ENV DEFAULT_WORKING_DIRECTORY=/workspace

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Run application
CMD ["node", "build/server/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - TRANSPORT=http
      - PORT=3000
      - BASE_URL=http://localhost:3000
      - OAUTH_ENABLED=true
      - OAUTH_CLIENT_ID=${OAUTH_CLIENT_ID}
      - OAUTH_CLIENT_SECRET=${OAUTH_CLIENT_SECRET}
      - LOG_LEVEL=info
    volumes:
      - workspace:/workspace
    restart: unless-stopped

volumes:
  workspace:
```

### Deploy to VPS

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Scale
docker-compose up -d --scale mcp-server=3
```

---

## OAuth Setup

### Generate Secure Credentials

```bash
# Generate client ID
export OAUTH_CLIENT_ID="mcp_$(openssl rand -hex 16)"

# Generate client secret
export OAUTH_CLIENT_SECRET="$(openssl rand -hex 32)"

echo "Client ID: $OAUTH_CLIENT_ID"
echo "Client Secret: $OAUTH_CLIENT_SECRET"
```

### Configure OAuth Endpoints

Your server automatically exposes:

- **Authorization Server Metadata**: `/.well-known/oauth-authorization-server`
- **Resource Server Metadata**: `/.well-known/oauth-protected-resource`
- **Token Endpoint**: `/oauth/token`

### Test OAuth Flow

```bash
# 1. Check discovery endpoint
curl https://your-server.com/.well-known/oauth-authorization-server

# 2. Get authorization code (simplified for testing)
# In production, use proper PKCE flow with code_challenge

# 3. Exchange code for token
curl -X POST https://your-server.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "auth_code_here",
    "code_verifier": "verifier_here",
    "resource": "https://your-server.com"
  }'

# 4. Use access token
curl -X POST https://your-server.com/mcp \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

---

## Monitoring & Logging

### Structured Logging

The server outputs structured logs:

```json
{
  "timestamp": "2025-10-30T10:30:00.000Z",
  "level": "INFO",
  "context": "MCP-Server",
  "message": "New session initialized",
  "sessionId": "mcp_abc123"
}
```

### Log Aggregation

**CloudWatch (AWS)**
```bash
# Logs automatically sent to CloudWatch Logs
aws logs tail /aws/lambda/claude-code-mcp --follow
```

**Google Cloud Logging**
```bash
gcloud logging read "resource.type=cloud_run_revision" --limit 50
```

**Railway**
```bash
railway logs
```

### Health Monitoring

All deployments expose `/health`:

```bash
curl https://your-server.com/health
# Response: {"status":"healthy","version":"2.0.0"}
```

### Uptime Monitoring

Use services like:
- **UptimeRobot** - Free tier, 5min intervals
- **Pingdom** - Professional monitoring
- **Better Uptime** - Status pages + monitoring

Example UptimeRobot config:
```
URL: https://your-server.com/health
Interval: 5 minutes
Expected: status":"healthy
```

---

## Performance Tuning

### Session Cleanup

Enable automatic cleanup in production:

```typescript
// In server/index.ts, add:
if (config.transport === 'http') {
  sessionManager.startCleanupInterval(15 * 60 * 1000); // 15 minutes
}
```

### Connection Pooling

For high-traffic deployments:

```typescript
// Limit concurrent sessions
const MAX_SESSIONS = 100;

if (sessionManager.listActiveSessions().length >= MAX_SESSIONS) {
  res.status(503).json({ error: 'Server at capacity' });
  return;
}
```

### Rate Limiting

Add Express rate limiting:

```bash
pnpm add express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/mcp', limiter);
```

---

## Troubleshooting

### Common Issues

**"Failed to connect to MCP server"**
- Check BASE_URL matches actual deployment URL
- Verify OAuth endpoints are accessible
- Check firewall/security group rules

**"OAuth token validation failed"**
- Ensure OAUTH_CLIENT_SECRET matches on client and server
- Check resource parameter matches BASE_URL
- Verify token hasn't expired

**"Claude command not found"**
- Install Claude Code CLI in Docker image
- Check PATH includes Claude Code
- Verify Claude Code is accessible: `claude --version`

**High memory usage**
- Enable session cleanup
- Reduce MAX_SESSIONS
- Check for memory leaks with `node --inspect`

---

## Security Checklist

- [ ] Use HTTPS in production (not HTTP)
- [ ] Store secrets in platform secret manager (not env files)
- [ ] Enable rate limiting
- [ ] Implement request logging
- [ ] Use strong OAuth secrets (32+ characters)
- [ ] Set restrictive CORS policy
- [ ] Enable security headers (helmet.js)
- [ ] Regular dependency updates (`pnpm audit`)
- [ ] Monitor for unusual activity
- [ ] Implement IP allowlisting (if applicable)

---

## Cost Optimization

### Free Tier Recommendations

1. **Start with Koyeb** - Best free tier, scale-to-zero
2. **Add Cloudflare** - Free CDN + edge compute
3. **Use Google Cloud Run** - 2M requests/month free

### Paid Tier Recommendations

1. **Railway** - Simple, predictable pricing
2. **Cloudflare Workers** - Global edge deployment
3. **AWS Lambda** - Pay-per-use at scale

---

## Next Steps

After deployment:

1. Test OAuth flow end-to-end
2. Configure MCP client to connect
3. Monitor logs for errors
4. Set up uptime monitoring
5. Document your deployment for team

Need help? [Open an issue](https://github.com/ChrisLally/claude-code-mcp/issues)