# Deployment Security Audit — Network & Infrastructure

**Focus:** What can an attacker do if they discover `propel-client-acme.up.railway.app`?

---

## ✅ Railway Container Isolation (SAFE)

Railway provides **full network isolation** between projects:
- Each client deployment = separate container + network namespace
- Client A cannot reach Client B's container
- No shared volumes between deployments
- Ephemeral filesystem (resets on redeploy)

**Verdict:** As long as Railway is secure, containers are isolated. ✅

---

## 🔒 Gateway Auth (DEFAULT: Token Required)

### **Default Behavior:**
- Auth mode: `token` (requires `PROPEL_GATEWAY_TOKEN` env var)
- If token not set: **Gateway crashes on startup** with error:
  ```
  "gateway auth mode is token, but no token was configured (set gateway.auth.token or PROPEL_GATEWAY_TOKEN)"
  ```

### **Railway Deployment:**
Our `railway.json` uses `--allow-unconfigured` which:
- ✅ Allows gateway to start without full config file
- ❌ **Does NOT bypass auth requirements**
- **Still requires `PROPEL_GATEWAY_TOKEN` to be set**

**Verdict:** Gateway **WILL NOT START** without a token. ✅

---

## 🌐 Exposed HTTP Endpoints

If someone discovers the Railway URL, here's what they can access:

### 1. **WebSocket Gateway** (`/` - WebSocket upgrade)
- **Auth:** Requires Bearer token (from `PROPEL_GATEWAY_TOKEN`)
- **Default:** Blocked without valid token
- **Risk:** ❌ None if token is set

### 2. **Hooks API** (`/hooks/*`)
- **Auth:** Requires `X-Propel-Token` header or `Authorization: Bearer <token>`
- **Token:** Separate hook token (set in config `gateway.hooks.token`)
- **Rate limiting:** 20 failures per minute → 1min lockout
- **Risk:** ❌ None if hook token is secret

### 3. **OpenAI-Compatible API** (`/v1/chat/completions`)
- **Auth:** Requires gateway auth (Bearer token)
- **Default:** Disabled unless `gateway.openai.enabled = true`
- **Risk:** ❌ None (requires explicit config + auth)

### 4. **OpenResponses API** (`/v1/chat/completions` alternative)
- **Auth:** Requires gateway auth
- **Default:** Disabled unless `gateway.openresponses.enabled = true`
- **Risk:** ❌ None (disabled by default)

### 5. **Tools Invoke API** (`/api/tools/invoke`)
- **Auth:** Requires gateway auth (Bearer token)
- **Risk:** ❌ None if token is set

### 6. **Channel APIs** (`/api/channels/*`)
- **Auth:** Requires gateway auth (Bearer token)
- **Risk:** ❌ None if token is set

### 7. **Control UI** (`/` - Web Dashboard)
- **Auth:** Device identity check (pairing code system)
- **Default:** Requires pairing unless `dangerouslyDisableDeviceAuth = true`
- **Risk:** ⚠️ **MEDIUM** — See below

### 8. **Canvas** (`/a2ui`, `/canvas`, `/canvas-ws`)
- **Auth:** Canvas capability token OR localhost-only
- **Default:** Requires capability OR fails
- **Risk:** ❌ None (requires capability auth)

### 9. **Slack Webhook** (if Slack channel enabled)
- **Auth:** Slack signing secret verification
- **Risk:** ❌ None (Slack verifies requests)

---

## ⚠️ CRITICAL: Control UI Security

### **What is the Control UI?**
- Web dashboard at `/` (root path)
- Shows session list, message history, config
- **Designed for localhost use** (connecting to your own gateway)

### **Default Auth:**
- **Pairing system:** Generates QR code, requires device approval
- **Device identity:** Stores device token after pairing
- **Secure context:** Requires HTTPS (or localhost)

### **Vulnerability:**
If `dangerouslyDisableDeviceAuth = true`:
- ❌ **Anyone** can access the web UI
- ❌ Can see all sessions, messages, config
- ❌ Can send messages as any agent
- ❌ Can modify gateway settings

### **Railway Deployment Risk:**
- Railway URLs are **HTTPS by default** ✅
- But if someone discovers the URL **AND** device auth is disabled: **FULL ACCESS** 🚨

---

## 🚨 HIGH-RISK SCENARIOS

### **Scenario 1: No Token Set**
**Setup:** Deploy to Railway without `PROPEL_GATEWAY_TOKEN`  
**Result:** Gateway crashes on startup ✅  
**Risk:** ❌ None (service won't run)

### **Scenario 2: Weak/Shared Token**
**Setup:** Use same token across all client deployments  
**Result:** Client A can connect to Client B's gateway  
**Risk:** 🚨 **CRITICAL DATA BREACH**

**Mitigation:**
```bash
# Generate unique token per client
PROPEL_GATEWAY_TOKEN=$(openssl rand -hex 32)
```

### **Scenario 3: Control UI With Disabled Auth**
**Setup:** `controlUi.dangerouslyDisableDeviceAuth = true`  
**Result:** Anyone with the URL can access the web dashboard  
**Risk:** 🚨 **FULL GATEWAY CONTROL**

**Mitigation:**
```json
// config.json5
{
  gateway: {
    controlUi: {
      enabled: false  // Disable entirely for production
    }
  }
}
```

### **Scenario 4: Hooks Exposed Without Rate Limiting**
**Setup:** Hooks enabled, weak token, no rate limiting  
**Result:** Attacker can brute-force hook token  
**Risk:** ⚠️ **MEDIUM** (20 attempts per minute before lockout)

**Mitigation:**
- Use strong hook token: `openssl rand -hex 32`
- Enable rate limiting (already default)
- Monitor gateway logs for auth failures

### **Scenario 5: URL Discovery via DNS/Subdomain Enum**
**Setup:** Railway URLs are predictable: `propel-client-acme.up.railway.app`  
**Result:** Attacker enumerates all client deployments  
**Risk:** ⚠️ **MEDIUM** (know who your clients are, but can't access without token)

**Mitigation:**
- Use random slugs: `propel-8f3h2k9.up.railway.app`
- Custom domains with randomized subdomains
- Cloudflare proxy to hide Railway origin

---

## ✅ MANDATORY Security Checklist

Before deploying ANY client:

- [ ] **1. Set unique `PROPEL_GATEWAY_TOKEN`**
  ```bash
  railway variables set PROPEL_GATEWAY_TOKEN=$(openssl rand -hex 32)
  ```

- [ ] **2. Disable Control UI (or keep device auth enabled)**
  ```bash
  railway variables set PROPEL_CONTROL_UI_ENABLED=false
  ```
  OR ensure `dangerouslyDisableDeviceAuth` is NOT set to `true`

- [ ] **3. Use strong hook token (if hooks enabled)**
  ```bash
  railway variables set PROPEL_HOOK_TOKEN=$(openssl rand -hex 32)
  ```

- [ ] **4. Set NODE_ENV=production**
  ```bash
  railway variables set NODE_ENV=production
  ```

- [ ] **5. Verify auth mode**
  ```bash
  # Check logs on first deploy
  railway logs
  # Should see: "gateway auth mode: token (source: config)"
  # Should NOT see: "auth mode: none"
  ```

- [ ] **6. Test unauthorized access**
  ```bash
  # Try connecting WITHOUT token
  wscat -c wss://propel-client-acme.up.railway.app
  # Expected: Connection refused or 401 Unauthorized
  ```

- [ ] **7. Verify Control UI is protected**
  ```bash
  curl https://propel-client-acme.up.railway.app/
  # If device auth enabled: Should show pairing UI
  # If disabled: 🚨 IMMEDIATE FIX REQUIRED
  ```

- [ ] **8. Check exposed endpoints**
  ```bash
  # Try OpenAI API without auth
  curl https://propel-client-acme.up.railway.app/v1/chat/completions
  # Expected: 401 Unauthorized (if enabled)
  # Expected: 404 Not Found (if disabled) ✅
  ```

---

## 🛡️ Recommended Deployment Config

### **Minimal Secure Config:**

```json5
// config.json5 (or set via env vars)
{
  gateway: {
    mode: "remote",  // Not local (local bypasses some checks)
    auth: {
      mode: "token",
      token: "${PROPEL_GATEWAY_TOKEN}"  // From env
    },
    controlUi: {
      enabled: false  // Disable for production client deployments
    },
    openai: {
      enabled: false  // Only enable if client specifically needs it
    },
    openresponses: {
      enabled: false  // Only enable if needed
    },
    hooks: {
      enabled: false,  // Only enable if needed
      token: "${PROPEL_HOOK_TOKEN}",  // Strong token if enabled
      basePath: "/hooks"
    }
  }
}
```

### **Railway Environment Variables:**

```bash
# MANDATORY
PROPEL_GATEWAY_TOKEN=<64-char-hex-string>  # openssl rand -hex 32
CLIENT_ID=acme-legal
CLIENT_NAME="Acme Legal"
NODE_ENV=production

# Auth tokens
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...  # If using OpenAI models

# Optional (if hooks enabled)
PROPEL_HOOK_TOKEN=<64-char-hex-string>

# Optional (allowlist users)
ALLOWED_USERS=user1@acme.com,user2@acme.com
```

---

## 📊 Attack Surface Summary

| Endpoint | Auth Required | Default State | Risk if Exposed |
|----------|--------------|---------------|-----------------|
| WebSocket (`/`) | ✅ Token | Enabled | ❌ None (auth blocks) |
| Control UI (`/`) | ⚠️ Device pairing | Enabled | 🚨 **HIGH** if auth disabled |
| OpenAI API | ✅ Token | Disabled | ❌ None |
| Hooks API | ✅ Hook token | Disabled | ⚠️ Medium (rate limited) |
| Canvas | ✅ Capability | Enabled | ❌ None |
| Tools API | ✅ Token | Enabled | ❌ None |
| Slack webhook | ✅ Slack signature | Disabled | ❌ None |

---

## 🚨 Emergency Response

If you suspect a deployment is exposed:

1. **Immediately rotate gateway token:**
   ```bash
   railway variables set PROPEL_GATEWAY_TOKEN=$(openssl rand -hex 32)
   railway up --detach  # Redeploy
   ```

2. **Check Railway logs for unauthorized access:**
   ```bash
   railway logs --tail 500 | grep "401\|403\|unauthorized"
   ```

3. **Disable Control UI:**
   ```bash
   railway variables set PROPEL_CONTROL_UI_ENABLED=false
   railway up --detach
   ```

4. **Audit active WebSocket connections:**
   - Connect to gateway
   - Check session list for unknown devices
   - Revoke suspicious sessions

5. **Notify affected client** (if data breach suspected)

---

## ✅ Final Verdict

**Q: As long as Railway is secure, is this secure?**

**A: YES, with these requirements:**

1. ✅ **Railway container isolation** (Railway provides this)
2. ✅ **Unique `PROPEL_GATEWAY_TOKEN` per client** (You must set this)
3. ✅ **Control UI disabled OR device auth enabled** (Default is safe, but check config)
4. ✅ **Strong hook tokens if hooks enabled** (Only enable if needed)
5. ✅ **No shared secrets between clients** (Each deployment = new tokens)

**Risk Level:**
- **With defaults + token set:** ✅ **LOW RISK**
- **With Control UI auth disabled:** 🚨 **CRITICAL RISK**
- **With weak/shared tokens:** 🚨 **CRITICAL RISK**

---

## Next Steps

1. Update `railway.json` to enforce security settings
2. Create deployment script that generates unique tokens
3. Add health check endpoint that verifies auth is enabled
4. Document emergency rotation procedure
5. Set up monitoring for failed auth attempts

Want me to create a deployment script that enforces these security requirements?
