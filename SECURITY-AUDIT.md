# Security Audit: Per-Client Railway Deployments

**Date:** 2026-02-23  
**Deployment Model:** One Railway project per client (complete isolation)  
**Risk Level:** LOW — Infrastructure-level isolation eliminates multi-tenant risks

---

## Deployment Model

Each client gets their own Railway project deploying from `jw29247/propel`:
- **Client A:** `propel-client-acme.up.railway.app`
- **Client B:** `propel-client-biglaw.up.railway.app`
- **Isolation:** Container-level (Docker) + network-level (Railway) + infrastructure-level (separate projects)

**No shared infrastructure:**
- ✅ Separate containers
- ✅ Separate networks
- ✅ Separate filesystems
- ✅ Separate environment variables
- ✅ Separate databases (if used)
- ✅ Separate API keys

**Result:** Zero cross-client data leakage risk.

---

## ✅ Safe: Infrastructure Isolation

### What's Protected:
- **Container:** Each deployment runs in its own Docker container
- **Filesystem:** Ephemeral, no shared volumes between clients
- **Memory:** Separate process space per deployment
- **Network:** Railway provides network isolation between projects
- **Environment:** Independent env vars per Railway project
- **Database:** Each client can have their own database (if needed)

### Why This Works:
Client A's deployment **cannot** access Client B's deployment because:
1. Different Railway projects
2. Different container runtimes
3. Different network namespaces
4. Different Railway domains

**Verification:** If one client's deployment crashes, others are unaffected.

---

## 🔒 Authentication (Per-Deployment)

### Required: `PROPEL_GATEWAY_TOKEN`

**Gateway won't start without it:**
```bash
# Without token:
node propel.mjs gateway
# Error: "gateway auth mode is token, but no token was configured"
# Process exits with code 1
```

**Setting token:**
```bash
# Railway env vars:
PROPEL_GATEWAY_TOKEN=$(openssl rand -hex 32)
```

**Auth check on every connection:**
- WebSocket connections require `Authorization: Bearer <token>`
- HTTP endpoints require `Authorization: Bearer <token>`
- Invalid token → 401 Unauthorized
- Rate limited after 10 failed attempts

**Token uniqueness:**
- ✅ Each client deployment gets unique token
- ❌ NEVER share tokens between deployments
- ✅ Token rotation = simple env var update + redeploy

---

## 🛡️ What We DON'T Need to Build

Because each client = separate deployment, we **skip all multi-tenant complexity:**

### ❌ Not Needed:
- ~~Multi-tenant database with org/user/team tables~~
- ~~Row-level security / client scoping~~
- ~~Shared database with client_id columns~~
- ~~Session isolation logic in code~~
- ~~ALLOWED_USERS environment checks~~
- ~~Client-scoped auth middleware~~
- ~~Complex RBAC~~
- ~~Cross-client admin panel~~
- ~~Tenant-aware query filtering~~

### ✅ What Handles It:
- **Railway project isolation** (infrastructure)
- **Separate containers** (OS-level)
- **Unique tokens** (per-deployment auth)

---

## 🔍 Attack Scenarios (and Why They're Blocked)

### Scenario 1: Token Brute Force
**Attack:** Attacker tries to guess `PROPEL_GATEWAY_TOKEN`

**Mitigation:**
- Token is 64-character hex string (256 bits entropy)
- Rate limiting: 10 failed attempts → 5-minute lockout
- Attack surface: Only WebSocket/HTTP endpoints
- Detection: Failed auth attempts logged

**Risk:** ⚠️ **LOW** (brute force infeasible)

---

### Scenario 2: Container Escape
**Attack:** Attacker compromises Client A's container, tries to access Client B

**Mitigation:**
- Railway uses Docker + containerd
- Separate network namespaces
- No shared volumes
- No inter-container communication

**Risk:** ❌ **NONE** (Railway's responsibility)

---

### Scenario 3: Token Leakage
**Attack:** Client A's token is leaked, attacker connects to their gateway

**Impact:**
- ✅ Only Client A affected
- ✅ Client B/C unaffected (different tokens)
- ✅ Easy mitigation: Rotate Client A's token

**Mitigation:**
```bash
# Rotate token for Client A only
railway variables set PROPEL_GATEWAY_TOKEN=$(openssl rand -hex 32)
railway up --detach
```

**Risk:** ⚠️ **MEDIUM** (isolated to one client)

---

### Scenario 4: Control UI Exposed
**Attack:** Attacker discovers Railway URL, accesses web dashboard

**Default Protection:**
- Control UI requires device pairing (QR code)
- Device identity stored in browser
- No access without pairing

**Production Recommendation:**
```bash
# Disable Control UI entirely for client deployments
PROPEL_CONTROL_UI_ENABLED=false
```

**Risk:** ❌ **NONE** (if disabled or device auth enabled)

---

### Scenario 5: Railway URL Discovery
**Attack:** Attacker enumerates Railway URLs to find client deployments

**Impact:**
- They discover `propel-client-acme.up.railway.app` exists
- Cannot connect without token
- Cannot access dashboard without device pairing
- No information disclosure (gateway returns 401)

**Mitigation:**
- Use random slugs instead of client names
- Custom domains with non-obvious subdomains
- Cloudflare proxy to hide Railway origin

**Risk:** ⚠️ **LOW** (discovery doesn't grant access)

---

## ✅ Deployment Security Checklist

Before deploying ANY client:

- [ ] **1. Generate unique token**
  ```bash
  openssl rand -hex 32
  ```

- [ ] **2. Set Railway env vars**
  ```bash
  PROPEL_GATEWAY_TOKEN=<unique-token>
  NODE_ENV=production
  PROPEL_CONTROL_UI_ENABLED=false
  CLIENT_ID=<client-slug>
  CLIENT_NAME=<Client Name>
  ANTHROPIC_API_KEY=sk-ant-...
  ```

- [ ] **3. Deploy**
  ```bash
  railway up --detach
  ```

- [ ] **4. Verify auth is enforced**
  ```bash
  # Try connecting without token
  curl https://<railway-url>/
  # Expected: 401 or 404
  ```

- [ ] **5. Test unauthorized WebSocket**
  ```bash
  wscat -c wss://<railway-url>/
  # Expected: Connection refused or 401
  ```

- [ ] **6. Verify Control UI is disabled**
  ```bash
  curl https://<railway-url>/ | grep -i "dashboard\|control"
  # Expected: No dashboard visible
  ```

- [ ] **7. Document deployment**
  - Client name
  - Railway URL
  - Token (stored securely)
  - Deployment date

---

## 🚨 Incident Response

### Token Compromised (Client A)

**Impact:** Only Client A affected

**Steps:**
1. Generate new token: `openssl rand -hex 32`
2. Update Railway env: `railway variables set PROPEL_GATEWAY_TOKEN=<new>`
3. Redeploy: `railway up --detach`
4. Notify Client A with new token
5. Audit logs for unauthorized access
6. **Client B/C unaffected** ✅

---

### Deployment Breach (Client A)

**Impact:** Client A's data potentially exposed

**Steps:**
1. Immediately stop deployment: `railway down`
2. Audit Railway logs for breach timeline
3. Rotate all secrets (token, API keys)
4. Notify Client A
5. Create new deployment with fresh secrets
6. **Client B/C unaffected** ✅

---

## 📊 Security Comparison

| Aspect | Multi-Tenant App | Per-Client Deployment |
|--------|-----------------|----------------------|
| Data isolation | Code-enforced | Infrastructure-enforced ✅ |
| Breach impact | All clients | One client ✅ |
| Auth complexity | RBAC + scoping | Token only ✅ |
| Database | Shared (scoped) | Separate ✅ |
| Deployment | One instance | N instances |
| Cost | Lower | Higher |
| Security | Code-dependent | Infrastructure-dependent ✅ |

**Trade-off:** Higher infrastructure cost for **much simpler security model**.

---

## ✅ Final Verdict

**Deployment Model: Per-client Railway projects**

**Security Level:** ✅ **HIGH**

**Why:**
1. Infrastructure-level isolation (not code-level)
2. Breach blast radius = one client only
3. No shared secrets
4. No multi-tenant code complexity
5. Railway handles container security
6. Simple token rotation per client

**Risk Areas:**
- ⚠️ Token leakage (mitigated by rotation)
- ⚠️ Control UI exposure (mitigated by disabling)
- ✅ Cross-client data leakage: **IMPOSSIBLE**

**Recommendation:** This is the **correct approach** for B2B SaaS. Infrastructure isolation is simpler and more secure than code-based multi-tenancy.

---

## Next Steps

1. ✅ Verify Docker build works
2. ✅ Test first Railway deployment
3. ✅ Document deployment process
4. ✅ Create deployment automation script
5. ✅ Set up monitoring per client
6. ✅ Create incident response playbook

See `RAILWAY-DEPLOY-CHECKLIST.md` for deployment procedures.
