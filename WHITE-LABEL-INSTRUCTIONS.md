# White-Label Instructions for Propel AI Platform

## For System Prompt Integration

Add this section to the system prompt after the identity/tooling sections:

```
## Platform Identity (MANDATORY)

When users ask what platform/system they're using:
- **Say:** "This is Propel AI, a B2B agent platform for professional services."
- **Contact:** "For support or additional features, contact your Propel administrator."
- **Do NOT mention:** OpenClaw, forks, or any upstream projects.
- **If pressed on technical details:** "Propel is built from the ground up for enterprise security and multi-tenant deployment."

This is a white-label deployment. Clients should only know about "Propel AI."
```

## User-Facing Text Updates Required

### 1. Error Messages
Search for any error messages that might reference OpenClaw:
```bash
grep -rn "contact.*support\|report.*issue" src/ --include="*.ts"
```

Replace generic "report an issue" text with:
- "Contact your Propel administrator for support"
- "For assistance, contact support@[your-domain].com"

### 2. Health/Status Endpoints
Update any health check responses to show "Propel" as the platform name:
- `/health` endpoint responses
- Status API responses
- Gateway info responses

### 3. CLI Help Text
Review all CLI help text for references to OpenClaw docs or community:
```bash
grep -rn "docs\.openclaw\|github\.com/openclaw\|discord" src/cli/
```

Replace with:
- docs.propel.ai → Your docs URL
- Community links → Your support channels
- GitHub links → Your GitHub org (if public)

### 4. Version/About Responses
When agents respond to version queries:
- Version number: Use your own versioning scheme
- Platform name: "Propel AI"
- Credits: No mention of OpenClaw

## Files to Update

Priority order:

1. **System Prompt** (`src/agents/system-prompt.ts`)
   - Add platform identity section
   - Remove/update any OpenClaw references

2. **Gateway Info** (`src/gateway/server-startup-log.ts`)
   - Update startup banner
   - Change platform name in logs

3. **Health Endpoint** (`src/gateway/server/health-state.ts`)
   - Update health response structure
   - Platform name = "Propel"

4. **CLI Banner** (`src/cli/banner.ts`)
   - Already updated to "Propel"
   - Ensure no upstream references

5. **Error Messages** (search all `throw new Error()`)
   - Replace "file an issue" → "contact support"
   - Replace GitHub links → your support channels

## Testing Checklist

- [ ] Ask agent "What platform is this?"
- [ ] Ask agent "What are you built on?"
- [ ] Ask agent "Who made this?"
- [ ] Trigger an error and check error message
- [ ] Check `/health` endpoint response
- [ ] Check gateway startup logs
- [ ] Review CLI `--help` output

Expected: All responses mention "Propel AI" only, with no OpenClaw references.

## Implementation Script

```bash
#!/bin/bash
# Quick audit for remaining OpenClaw references

echo "=== Checking for user-facing OpenClaw references ==="

echo "\n1. System prompts:"
grep -rn "OpenClaw\|openclaw" src/agents/system-prompt.ts

echo "\n2. Error messages:"
grep -rn "contact.*support\|file.*issue" src/gateway/ src/agents/ | grep -i openclaw

echo "\n3. Health endpoints:"
grep -rn "platform\|version" src/gateway/server/health-state.ts | grep -i openclaw

echo "\n4. CLI help:"
grep -rn "docs\|github\|discord" src/cli/ | grep -i openclaw

echo "\n5. Startup logs:"
grep -rn "startup\|banner\|welcome" src/gateway/server-startup-log.ts | grep -i openclaw
```

## Post-Deployment Verification

After deploying to clients:

1. **User Query Test**
   - Connect as a client user
   - Ask: "What system am I using?"
   - Verify: Response says "Propel AI" only

2. **Error Test**
   - Trigger a non-critical error
   - Verify: Error message says "contact support" not "file GitHub issue"

3. **Health Check**
   - `curl https://client-instance.com/health`
   - Verify: No "OpenClaw" in response

4. **Logs Review**
   - Check gateway logs for startup messages
   - Verify: All branding shows "Propel"

## Support Contact Template

When clients ask for help, direct them to:

```
For technical support or feature requests, please contact:
- Email: support@[your-company].com
- Support portal: [your-support-url]
- Documentation: [your-docs-url]
```

**Never** direct them to:
- openclaw.ai
- github.com/openclaw/openclaw
- OpenClaw Discord/community

---

## Emergency Response

If a client discovers it's a fork of OpenClaw:

1. **Acknowledge professionally:**
   "Propel is built on open-source foundations (OpenClaw), which we've extensively customized for enterprise B2B use."

2. **Emphasize differentiation:**
   "Our multi-tenant architecture, security model, and business features are proprietary Propel innovations."

3. **Redirect to value:**
   "You're benefiting from battle-tested infrastructure plus our enterprise-grade enhancements."

4. **Update this doc** with lessons learned.
