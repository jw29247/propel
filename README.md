# Propel — B2B AI Agent Platform

**AI Agent Implementation for Professional Services**

Propel is an AI agent platform designed for B2B professional services firms (law, accounting, consulting, etc.). Each client gets their own isolated deployment with enterprise-ready agent orchestration and compliance-first architecture.

## Deployment Model

**One deployment per client** — Complete infrastructure isolation:
- Each client = separate Railway/container deployment
- No shared databases or storage
- Independent scaling and configuration
- Zero cross-client data leakage risk

## Status

⚠️ **Early Development** — This project is under active development. Not production-ready.

## Architecture

- **Gateway Server** — WebSocket-based gateway with token auth
- **Agent Runtime** — Model-agnostic AI orchestration (Anthropic, OpenAI, etc.)
- **Session Management** — Multi-session support per deployment
- **Tool System** — Extensible tools for business workflows
- **Security** — Token-based auth, rate limiting, isolated deployments

## Quick Start

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run gateway (requires PROPEL_GATEWAY_TOKEN env var)
export PROPEL_GATEWAY_TOKEN=$(openssl rand -hex 32)
node propel.mjs gateway
```

## Railway Deployment

See `RAILWAY-DEPLOY-CHECKLIST.md` for step-by-step deployment guide.

**Minimal deployment:**
```bash
# Required env vars
PROPEL_GATEWAY_TOKEN=<unique-token-per-client>
ANTHROPIC_API_KEY=sk-ant-...
NODE_ENV=production
PROPEL_CONTROL_UI_ENABLED=false
```

## Security

- **Token auth required** — Gateway won't start without `PROPEL_GATEWAY_TOKEN`
- **Container isolation** — Each client deployment is fully isolated
- **No shared secrets** — Every deployment uses unique tokens
- **Default secure** — All endpoints require authentication

See `DEPLOYMENT-SECURITY.md` for full security audit.

## Roadmap

- [x] White-label platform identity
- [x] Railway deployment configuration
- [x] Security audit and deployment checklist
- [ ] Docker build verification
- [ ] Business agent templates (intake, research, compliance)
- [ ] Per-client branding (logo, colors via env vars)
- [ ] Usage tracking and monitoring
- [ ] Automated deployment scripts

## License

MIT
