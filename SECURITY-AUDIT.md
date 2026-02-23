# Security Audit: Per-Client Railway Deployments

**Date:** 2026-02-23  
**Scope:** Isolated per-client Propel deployments on Railway  
**Risk Level:** HIGH — Multi-client data isolation is critical

---

## Deployment Model

Each client gets their own Railway project deploying from `jw29247/propel`:
- **Client A:** `propel-client-acme.up.railway.app`
- **Client B:** `propel-client-biglaw.up.railway.app`
- **Isolation:** Container-level (Docker) + network-level (Railway)

---

## ✅ Safe: Container Isolation

### What's Protected:
- **Filesystem:** Each deployment has its own ephemeral filesystem
- **Memory:** Separate process space per container
- **Network:** Railway provides network isolation between projects
- **Environment:** Each project has independent env vars

### Verification:
```bash
# Test: Files written in one deployment do NOT appear in another
# Expected: Each container starts fresh with no shared state
```

---

## ⚠️ CRITICAL: Auth & Access Control

### Current State:
The codebase has **NO built-in multi-client isolation** because it was designed for single-user personal use.

### Required Changes:

#### 1. **Client-Specific Allowlist (MANDATORY)**
Add environment-based user allowlisting:

```typescript
// src/config/client.ts (NEW FILE)
export const clientConfig = {
  clientId: process.env.CLIENT_ID || 'unknown',
  clientName: process.env.CLIENT_NAME || 'Propel Client',
  allowedUsers: (process.env.ALLOWED_USERS || '').split(',').filter(Boolean),
  allowedDomains: (process.env.ALLOWED_DOMAINS || '').split(',').filter(Boolean),
};

export function isUserAllowed(userId: string, email?: string): boolean {
  const { allowedUsers, allowedDomains } = clientConfig;
  
  // Check user ID allowlist
  if (allowedUsers.length > 0 && !allowedUsers.includes(userId)) {
    return false;
  }
  
  // Check email domain allowlist
  if (email && allowedDomains.length > 0) {
    const domain = email.split('@')[1];
    if (!allowedDomains.some(d => domain === d || domain.endsWith(`.${d}`))) {
      return false;
    }
  }
  
  return true;
}
```

#### 2. **Auth Middleware (MANDATORY)**
Wrap all gateway methods with allowlist check:

```typescript
// src/gateway/auth-middleware.ts (NEW FILE)
import { clientConfig, isUserAllowed } from '../config/client.js';

export function requireClientAuth(userId: string, userEmail?: string): void {
  if (!isUserAllowed(userId, userEmail)) {
    throw new Error(`Access denied: User ${userId} not allowed for client ${clientConfig.clientId}`);
  }
}
```

Apply to:
- `src/gateway/server-chat.ts` — Before processing messages
- `src/gateway/server-methods.ts` — Before all RPC methods
- `src/channels/` — Before channel message handling

---

## 🔒 Data Leakage Vectors

### 1. **Session Storage**

**Risk:** Sessions stored to disk could leak between deployments if volume is reused.

**Current Implementation:**
```bash
# Check session storage location
grep -r "sessions.*store\|session.*path" src/config/
```

**Mitigation:**
- **Option A:** Ephemeral sessions only (no disk persistence)
- **Option B:** Prefix all session keys with `CLIENT_ID` env var
- **Option C:** Use external session store (Redis/Postgres) with client-scoped keys

**Action Required:** Audit `src/sessions/` and `src/config/sessions.ts`

---

### 2. **Model API Keys**

**Risk:** If API keys are hardcoded or shared, one client could exhaust another's quota.

**Current Implementation:**
- Keys should be in env vars: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`

**Mitigation:**
- ✅ Each Railway project has separate env vars
- ✅ No shared key pool
- ⚠️ **Verify:** No hardcoded keys in codebase

**Action Required:**
```bash
# Search for hardcoded API keys
grep -rE "(sk-[a-zA-Z0-9]{48}|anthropic_[a-zA-Z0-9]+)" src/
```

---

### 3. **Logging**

**Risk:** Logs might contain PII or client-specific data visible to other deployments.

**Current Implementation:**
- Logs go to Railway's stdout/stderr (isolated per project ✅)
- Check for log file writes: `grep -r "createWriteStream\|fs.writeFile" src/`

**Mitigation:**
- ✅ Railway isolates logs per project
- ⚠️ **Verify:** No shared log files on disk

**Action Required:**
```bash
# Check for file-based logging
grep -rn "createWriteStream\|appendFile\|writeFile.*log" src/
```

---

### 4. **Database / External Storage**

**Risk:** If multiple clients share a database/storage, data leakage is possible.

**Current Implementation:**
- Check for database connections: `grep -r "DATABASE_URL\|db.connect" src/`

**Mitigation:**
- **Per-client databases** (if using Postgres/Redis)
- **OR:** Client-scoped keys/tables in shared DB
- ⚠️ **Verify:** No shared state in external services

**Action Required:** Audit all external service integrations.

---

### 5. **Filesystem Persistence**

**Risk:** Railway's ephemeral filesystem resets on redeploy, but volumes could leak data.

**Mitigation:**
- ✅ Don't use Railway volumes (keep ephemeral)
- ✅ Document: "All client data must be in env vars or external services"

**Action Required:**
```bash
# Check for file writes that might persist
grep -rn "fs.writeFile\|fs.mkdir\|WORKSPACE_DIR" src/
```

---

### 6. **Environment Variable Exposure**

**Risk:** Env vars logged or exposed via API could leak secrets.

**Current Implementation:**
- Gateway has `/health` endpoint — check what it exposes

**Mitigation:**
- **Audit `/health` response** — no env vars
- **Audit error messages** — no env vars in stack traces
- Add `NODE_ENV=production` to Railway

**Action Required:**
```bash
# Check health endpoint
grep -rn "/health\|health.*endpoint" src/gateway/
```

---

## 🚨 High-Risk Code Patterns

### Pattern 1: Global Singletons
```typescript
// ❌ BAD: Global state leaks between requests
const globalCache = new Map();

export function cacheData(key, value) {
  globalCache.set(key, value); // ⚠️ NOT isolated per client
}
```

**Fix:** All state must be scoped to request/session/user context.

### Pattern 2: Hardcoded Defaults
```typescript
// ❌ BAD: Hardcoded client name
const clientName = "Acme Legal";

// ✅ GOOD: Environment-based
const clientName = process.env.CLIENT_NAME || "Default Client";
```

### Pattern 3: Shared Filesystem State
```typescript
// ❌ BAD: Shared file
const cacheFile = "/tmp/cache.json";

// ✅ GOOD: Client-scoped or ephemeral
const cacheFile = `/tmp/cache-${process.env.CLIENT_ID}.json`;
```

---

## 🔍 Audit Checklist

Run these checks before first deployment:

- [ ] **1. No hardcoded secrets**
  ```bash
  grep -rE "(sk-[a-zA-Z0-9]{48}|anthropic_[a-zA-Z0-9]+|password.*=|token.*=)" src/
  ```

- [ ] **2. No global mutable state**
  ```bash
  grep -rn "new Map()\|new Set()\|const.*=.*\[\]" src/ | grep -v "function\|class"
  ```

- [ ] **3. No shared log files**
  ```bash
  grep -rn "createWriteStream\|appendFile.*log" src/
  ```

- [ ] **4. No shared database without client scoping**
  ```bash
  grep -rn "DATABASE_URL\|db.connect\|redis.connect" src/
  ```

- [ ] **5. Auth middleware applied**
  - Verify `requireClientAuth()` is called in:
    - `src/gateway/server-chat.ts`
    - `src/gateway/server-methods.ts`
    - All channel handlers

- [ ] **6. Health endpoint sanitized**
  ```bash
  # Check /health response doesn't include env vars
  curl http://localhost:18789/health
  ```

- [ ] **7. Client config loaded**
  ```bash
  # Verify CLIENT_ID, CLIENT_NAME, ALLOWED_USERS are required
  node propel.mjs gateway --allow-unconfigured
  ```

- [ ] **8. Railway env vars set**
  - `CLIENT_ID` ✅
  - `CLIENT_NAME` ✅
  - `ALLOWED_USERS` ✅
  - `PROPEL_GATEWAY_TOKEN` ✅
  - `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` ✅
  - `NODE_ENV=production` ✅

---

## 🛡️ Recommended Deployment Flow

1. **Create Railway project** for new client
2. **Set environment variables** (see checklist above)
3. **Deploy from `main` branch**
4. **Test auth** — verify only allowed users can connect
5. **Test isolation** — verify no data leakage between clients
6. **Monitor logs** — check for PII or secrets in logs
7. **Document** — Add client to internal deployment registry

---

## 🚨 Emergency Response

If data leakage is suspected:

1. **Immediately** stop all affected Railway projects
2. **Audit logs** for unauthorized access
3. **Rotate all API keys** for affected clients
4. **Notify affected clients** (legal/compliance requirement)
5. **Root cause analysis** — document and fix vulnerability
6. **Re-deploy** with fix and verify isolation

---

## Next Steps

1. **Implement client config** (`src/config/client.ts`)
2. **Add auth middleware** (`src/gateway/auth-middleware.ts`)
3. **Run audit checklist** (all items above)
4. **Test deployment** (one test client on Railway)
5. **Penetration test** (attempt to breach isolation)
6. **Document** (deployment playbook for new clients)

---

## Open Questions

- [ ] Do we need persistent storage? (sessions, files, etc.)
- [ ] Should we use a shared database with client scoping?
- [ ] What's the incident response plan for data leakage?
- [ ] Who has access to Railway admin console?
- [ ] What's the backup/disaster recovery plan?
