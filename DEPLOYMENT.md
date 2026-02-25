# Propel Deployment Guide

## Overview

Each Propel client gets a fully isolated deployment. No shared databases, no cross-tenant data, independent scaling.

## Required Environment Variables

```bash
PROPEL_GATEWAY_TOKEN=<unique-token-per-client>
ANTHROPIC_API_KEY=sk-ant-...
NODE_ENV=production
PROPEL_CONTROL_UI_ENABLED=false
```

## Deployment Checklist

See `RAILWAY-DEPLOY-CHECKLIST.md` for step-by-step Railway deployment.
See `DEPLOYMENT-SECURITY.md` for security audit and hardening guide.

## Platform Identity

All client-facing text references "Propel AI" — no upstream project references.

- Agent name defaults to "Propel"
- CLI banner displays Propel branding
- Error messages and help text reference Propel documentation
- Support inquiries directed to client's Propel administrator

## Per-Client Customisation

Clients can customise agent identity via `propel.json`:

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "identity": {
          "name": "Custom Agent Name",
          "emoji": "⚡",
          "theme": "professional assistant"
        }
      }
    ]
  }
}
```

## Verification

After deployment, verify:

1. `curl <gateway-url>/health` returns healthy status
2. Agent responses reference "Propel" only
3. CLI banner shows Propel branding
4. No upstream project references in any user-facing output
