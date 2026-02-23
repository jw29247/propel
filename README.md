# Propel — B2B AI Agent Platform

**AI Agent Implementation for Professional Services**

Propel is a multi-tenant AI agent platform designed for B2B professional services firms (law, accounting, consulting, etc.). It provides enterprise-ready agent orchestration, multi-org support, and compliance-first architecture.

## Status

⚠️ **Early Development** — This project is under active development. Not production-ready.

## Architecture

- **Gateway Server** — WebSocket-based multi-tenant gateway
- **Agent Runtime** — Model-agnostic AI orchestration (Anthropic, OpenAI, etc.)
- **Multi-tenancy** — Organizations, teams, users, RBAC
- **Session Management** — Isolated sessions per org
- **Tool System** — Extensible tools for business workflows

## Quick Start

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run gateway
node dist/index.js gateway

# Or use CLI
node propel.mjs gateway
```

## Roadmap

- [ ] Multi-tenant auth + RBAC
- [ ] Business agent templates (intake, research, compliance)
- [ ] REST API + WebSocket
- [ ] Web dashboard
- [ ] Billing integration (Stripe)
- [ ] SSO (Google Workspace, Microsoft Entra)
- [ ] Audit logs + compliance

## License

MIT
