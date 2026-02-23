# Railway Deployment Checklist

**Use this checklist for EVERY new client deployment.**

---

## Pre-Deployment

- [ ] Client name decided (e.g., "Acme Legal")
- [ ] Client slug generated (e.g., "acme-legal")
- [ ] Generate unique gateway token: `openssl rand -hex 32`
- [ ] Generate unique hook token (if hooks needed): `openssl rand -hex 32`
- [ ] API keys ready (Anthropic, OpenAI, etc.)

---

## Railway Project Setup

1. **Create new Railway project:**
   ```bash
   railway init
   # Name: propel-client-<slug>
   ```

2. **Connect to GitHub repo:**
   ```bash
   railway link jw29247/propel
   ```

3. **Set branch:**
   ```bash
   railway environment
   # Select: production
   # Branch: main
   ```

---

## Environment Variables (MANDATORY)

Copy/paste and fill in values:

```bash
# === MANDATORY SECURITY ===
railway variables set PROPEL_GATEWAY_TOKEN="<paste-64-char-token-here>"
railway variables set NODE_ENV="production"
railway variables set PROPEL_CONTROL_UI_ENABLED="false"

# === CLIENT IDENTITY ===
railway variables set CLIENT_ID="<client-slug>"
railway variables set CLIENT_NAME="<Client Full Name>"

# === MODEL API KEYS ===
railway variables set ANTHROPIC_API_KEY="sk-ant-..."
# railway variables set OPENAI_API_KEY="sk-..."  # If using OpenAI

# === OPTIONAL: User Allowlist ===
# railway variables set ALLOWED_USERS="user1@client.com,user2@client.com"

# === OPTIONAL: Hooks (if enabled) ===
# railway variables set PROPEL_HOOK_TOKEN="<paste-64-char-hook-token-here>"
```

---

## Deploy

```bash
railway up --detach
```

Wait for deployment to complete (~2-5 minutes).

---

## Post-Deployment Verification

### 1. Check Logs

```bash
railway logs --tail 100
```

**Look for:**
- ✅ `gateway auth mode: token`
- ✅ `listening on ...`
- ❌ No errors about missing token
- ❌ No `auth mode: none`

### 2. Get Deployment URL

```bash
railway domain
```

Copy the URL (e.g., `propel-client-acme.up.railway.app`).

### 3. Test Auth (CRITICAL)

```bash
# Try to connect WITHOUT token (should fail)
curl -i https://<railway-url>/

# Expected: 401 Unauthorized OR pairing UI (if Control UI enabled)
# NOT EXPECTED: Working dashboard without pairing
```

### 4. Test WebSocket Auth

```bash
# Install wscat if needed: npm install -g wscat
wscat -c wss://<railway-url>/

# Expected: Connection refused or 401
```

### 5. Verify Control UI is Disabled

```bash
curl https://<railway-url>/ | grep -i "control\|dashboard\|propel"

# Expected: 404 or minimal response
# If you see a full dashboard: 🚨 CONTROL UI IS ENABLED - FIX IMMEDIATELY
```

### 6. Check Health Endpoint

```bash
curl https://<railway-url>/health

# Expected: {"status": "ok"} or 404 (health not exposed)
```

---

## Security Test (MANDATORY)

**From a different machine/network (not logged into Railway):**

1. Open `https://<railway-url>/` in incognito browser
2. **Expected:** 404 or pairing QR code
3. **NOT EXPECTED:** Full dashboard with session list

If you see session list without pairing: **STOP AND FIX IMMEDIATELY**

---

## Client Handoff

### Send to Client:

1. **Deployment URL:** `https://<railway-url>/`
2. **Access instructions:**
   - WebSocket endpoint: `wss://<railway-url>/`
   - Gateway token: `<PROPEL_GATEWAY_TOKEN value>`
   - Auth mode: `token`
   - Example connection code (if applicable)

3. **Support contact:**
   - Email: support@[your-company].com
   - Documentation: [your-docs-url]

### Document Deployment:

Create entry in internal registry:

```
Client: <Client Name>
Slug: <client-slug>
Railway Project: propel-client-<slug>
URL: https://<railway-url>/
Deployed: <date>
Token Rotation: <never|quarterly|annually>
```

---

## Monitoring Setup (Optional but Recommended)

1. **Railway Notifications:**
   - Enable deployment notifications
   - Enable crash notifications

2. **External Monitoring:**
   - Add uptime monitor (UptimeRobot, Pingdom, etc.)
   - Monitor URL: `https://<railway-url>/health`
   - Check interval: 5 minutes
   - Alert on: 3 consecutive failures

3. **Log Monitoring:**
   - Watch for repeated 401 errors (potential brute force)
   - Watch for crashes
   - Set up log retention (Railway default: 7 days)

---

## Emergency Procedures

### Token Rotation

```bash
# Generate new token
NEW_TOKEN=$(openssl rand -hex 32)

# Update Railway
railway variables set PROPEL_GATEWAY_TOKEN="$NEW_TOKEN"

# Redeploy
railway up --detach

# Notify client of new token
```

### Disable Deployment

```bash
# Stop the service
railway down

# Or delete the project
railway delete
```

### Rollback

```bash
# List deployments
railway deployments

# Rollback to previous
railway rollback <deployment-id>
```

---

## Common Issues

### Issue: Gateway won't start

**Symptoms:** Crashes immediately after deploy

**Check:**
```bash
railway logs | grep -i "error\|token"
```

**Fix:** Ensure `PROPEL_GATEWAY_TOKEN` is set

---

### Issue: 502 Bad Gateway

**Symptoms:** Railway URL returns 502

**Causes:**
- Gateway crashed
- Port mismatch (Railway's `$PORT` not used)

**Fix:**
```bash
railway logs --tail 50
# Check for errors
```

---

### Issue: Client can't connect

**Symptoms:** WebSocket connection fails

**Check:**
1. Token is correct
2. URL is correct (wss:// not ws://)
3. Firewall allows WebSocket connections

---

## Notes

- **Token Security:** Never commit tokens to git, never share in public channels
- **URL Privacy:** Railway URLs are public-facing. Use random slugs if needed.
- **Cost:** Railway charges ~$0.000463/GB-hour for compute. Estimate $10-20/month per client.
- **Scaling:** Each client = separate Railway project. No shared infrastructure.

---

**Last Updated:** 2026-02-23
