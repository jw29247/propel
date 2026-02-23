# Propel Architecture

**Deployment Model:** One deployment per client (infrastructure isolation)

---

## Overview

Propel is a B2B AI agent platform that uses **infrastructure-level isolation** instead of code-level multi-tenancy. Each client gets their own complete deployment with zero shared infrastructure.

---

## Deployment Model

```
┌─────────────────────────────────────────────────────────────┐
│                     Railway Platform                        │
│                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │  Client A      │  │  Client B      │  │  Client C      │ │
│  │  Project       │  │  Project       │  │  Project       │ │
│  │                │  │                │  │                │ │
│  │  ┌──────────┐  │  │  ┌──────────┐  │  │  ┌──────────┐  │ │
│  │  │ Container│  │  │  │ Container│  │  │  │ Container│  │ │
│  │  │          │  │  │  │          │  │  │  │          │  │ │
│  │  │ Propel   │  │  │  │ Propel   │  │  │  │ Propel   │  │ │
│  │  │ Gateway  │  │  │  │ Gateway  │  │  │  │ Gateway  │  │ │
│  │  │          │  │  │  │          │  │  │  │          │  │ │
│  │  └──────────┘  │  │  └──────────┘  │  │  └──────────┘  │ │
│  │                │  │                │  │                │ │
│  │  Unique Token  │  │  Unique Token  │  │  Unique Token  │ │
│  │  Own Env Vars  │  │  Own Env Vars  │  │  Own Env Vars  │ │
│  │  Own Database  │  │  Own Database  │  │  Own Database  │ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
│                                                             │
│  No shared infrastructure, secrets, or data                │
└─────────────────────────────────────────────────────────────┘
```

---

## Why This Approach?

### ✅ **Pros:**
1. **Simple security model** — No multi-tenant code complexity
2. **Zero cross-client risk** — Containers can't access each other
3. **Isolated blast radius** — Breach affects one client only
4. **Easy token rotation** — Per-client env var update
5. **Independent scaling** — Each client scales separately
6. **Independent updates** — Deploy updates per client or all at once
7. **Client-specific config** — Full customization per deployment

### ⚠️ **Trade-offs:**
1. **Higher infrastructure cost** — N deployments vs 1
2. **More deployments to manage** — Automation required
3. **No cross-client features** — (Not needed for our use case)

**Verdict:** For B2B SaaS, **infrastructure isolation is worth the cost**.

---

## Tech Stack

### **Runtime:**
- Node.js (v22+)
- TypeScript
- WebSocket gateway

### **Deployment:**
- Railway (container platform)
- Docker (containerization)
- GitHub (source control)

### **Security:**
- Token-based auth (per deployment)
- Rate limiting (built-in)
- HTTPS (Railway automatic)

### **AI Models:**
- Anthropic Claude (via API)
- OpenAI (optional)
- Model-agnostic architecture

---

## Per-Client Deployment

### **What's Unique Per Client:**
```
Environment Variables:
  PROPEL_GATEWAY_TOKEN=<unique-64-char-token>
  CLIENT_ID=acme-legal
  CLIENT_NAME="Acme Legal"
  ANTHROPIC_API_KEY=<client-specific-key>
  
Railway Project:
  Name: propel-client-acme
  URL: propel-client-acme.up.railway.app
  
Container:
  Image: Built from jw29247/propel
  Network: Isolated
  Filesystem: Ephemeral
```

### **What's Shared (via Git):**
- Source code (from GitHub)
- Docker build process
- Gateway logic
- Agent runtime
- Tool system

**Updates:** Pull request to `main` → redeploy all clients (or selectively)

---

## Security Model

### **Authentication:**
```
Client connects to gateway
    ↓
Client sends: Authorization: Bearer <PROPEL_GATEWAY_TOKEN>
    ↓
Gateway validates token
    ↓
If valid: Connection established
If invalid: 401 Unauthorized (rate limited after 10 failures)
```

### **Isolation:**
```
Client A deployment → Cannot access → Client B deployment
  ↓                                       ↓
Different container                    Different container
Different network                      Different network
Different token                        Different token
Different filesystem                   Different filesystem
Different database                     Different database
```

---

## Data Flow

### **Client Connection:**
```
Client App
    ↓
WebSocket (wss://propel-client-acme.up.railway.app/)
    ↓
Railway Load Balancer
    ↓
Propel Gateway (Container)
    ↓
Agent Runtime
    ↓
AI Model API (Anthropic/OpenAI)
```

### **Storage:**
- **Ephemeral:** Container filesystem (resets on redeploy)
- **Persistent (optional):** External database per client
- **Sessions:** In-memory or external store
- **Logs:** Railway logging (7-day retention)

---

## Scaling

### **Horizontal:**
- Add more client deployments (new Railway projects)
- Each client = independent resource allocation
- No shared bottlenecks

### **Vertical:**
- Upgrade Railway plan per client
- Adjust container resources per deployment
- Independent of other clients

### **Cost Model:**
```
Base cost per client: ~$10-20/month (Railway compute)
Variable cost: API usage (Anthropic/OpenAI)
Total cost scales linearly with client count
```

---

## Deployment Workflow

### **New Client:**
1. Generate unique `PROPEL_GATEWAY_TOKEN`
2. Create Railway project
3. Set environment variables
4. Deploy from `main` branch
5. Verify auth + isolation
6. Handoff URL + token to client

### **Updates:**
1. Open PR to `jw29247/propel:main`
2. Review + merge
3. Redeploy clients (all or selective)
4. Verify updates

### **Incident Response:**
1. Identify affected client
2. Rotate secrets for that client only
3. Redeploy affected client
4. Other clients unaffected ✅

---

## Client Customization (Future)

### **Per-Client Branding:**
```bash
# Environment variables
PROPEL_BRAND_LOGO_URL=https://client.com/logo.png
PROPEL_BRAND_PRIMARY_COLOR=#0066cc
PROPEL_BRAND_NAME="Acme Legal AI"
```

### **Per-Client Features:**
```bash
# Feature flags
PROPEL_ENABLE_DOCUMENT_PROCESSING=true
PROPEL_ENABLE_RESEARCH_AGENT=true
PROPEL_ENABLE_COMPLIANCE_CHECKER=false
```

### **Per-Client Usage Tracking:**
```bash
# Analytics
PROPEL_ANALYTICS_PROJECT_ID=acme-legal
PROPEL_ANALYTICS_API_KEY=<analytics-key>
```

---

## Monitoring (Per Client)

### **Uptime:**
- External monitor (UptimeRobot, Pingdom)
- Check: `https://<client-url>/health`
- Alert on 3 consecutive failures

### **Logs:**
- Railway built-in logging
- 7-day retention (default)
- Export to external service if needed

### **Metrics:**
- Railway resource usage
- API token usage (Anthropic/OpenAI)
- Session count
- Error rates

---

## Comparison: Multi-Tenant vs Per-Client

| Aspect | Multi-Tenant App | Per-Client Deployment (Propel) |
|--------|-----------------|-------------------------------|
| **Security** | Code-enforced isolation | Infrastructure-enforced ✅ |
| **Breach impact** | All clients at risk | One client only ✅ |
| **Complexity** | High (RBAC, scoping) | Low (simple token auth) ✅ |
| **Database** | Shared (with scoping) | Separate per client ✅ |
| **Secrets** | Shared (scoped access) | Unique per client ✅ |
| **Deployment** | One instance | N instances |
| **Cost** | Lower | Higher (~10-20x) |
| **Scaling** | Vertical (shared resources) | Horizontal (independent) ✅ |
| **Customization** | Limited (shared codebase) | Full (per-deployment config) ✅ |
| **Updates** | All clients at once | Selective or all ✅ |

**Trade-off:** Higher cost for **dramatically simpler security**.

---

## Future Enhancements

### **Automation:**
- [ ] Deployment script (auto-generate tokens, create Railway project)
- [ ] Monitoring setup (per-client uptime checks)
- [ ] Backup automation (if using persistent storage)

### **Client Features:**
- [ ] Per-client branding
- [ ] Per-client feature flags
- [ ] Per-client agent templates
- [ ] Per-client usage analytics

### **Operations:**
- [ ] Centralized client registry
- [ ] Bulk update tool
- [ ] Health dashboard (all clients)
- [ ] Incident response playbook

---

## Summary

**Propel uses infrastructure-level isolation for B2B deployments.**

**One deployment = One client = Complete isolation**

This approach prioritizes **security simplicity** over infrastructure cost, which is the right trade-off for professional services B2B SaaS.
