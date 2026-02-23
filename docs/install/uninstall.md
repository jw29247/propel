---
summary: "Uninstall Propel completely (CLI, service, state, workspace)"
read_when:
  - You want to remove Propel from a machine
  - The gateway service is still running after uninstall
title: "Uninstall"
---

# Uninstall

Two paths:

- **Easy path** if `propel` is still installed.
- **Manual service removal** if the CLI is gone but the service is still running.

## Easy path (CLI still installed)

Recommended: use the built-in uninstaller:

```bash
propel uninstall
```

Non-interactive (automation / npx):

```bash
propel uninstall --all --yes --non-interactive
npx -y propel uninstall --all --yes --non-interactive
```

Manual steps (same result):

1. Stop the gateway service:

```bash
propel gateway stop
```

2. Uninstall the gateway service (launchd/systemd/schtasks):

```bash
propel gateway uninstall
```

3. Delete state + config:

```bash
rm -rf "${PROPEL_STATE_DIR:-$HOME/.propel}"
```

If you set `PROPEL_CONFIG_PATH` to a custom location outside the state dir, delete that file too.

4. Delete your workspace (optional, removes agent files):

```bash
rm -rf ~/.propel/workspace
```

5. Remove the CLI install (pick the one you used):

```bash
npm rm -g propel
pnpm remove -g propel
bun remove -g propel
```

6. If you installed the macOS app:

```bash
rm -rf /Applications/Propel.app
```

Notes:

- If you used profiles (`--profile` / `PROPEL_PROFILE`), repeat step 3 for each state dir (defaults are `~/.propel-<profile>`).
- In remote mode, the state dir lives on the **gateway host**, so run steps 1-4 there too.

## Manual service removal (CLI not installed)

Use this if the gateway service keeps running but `propel` is missing.

### macOS (launchd)

Default label is `bot.molt.gateway` (or `bot.molt.<profile>`; legacy `com.propel.*` may still exist):

```bash
launchctl bootout gui/$UID/bot.molt.gateway
rm -f ~/Library/LaunchAgents/bot.molt.gateway.plist
```

If you used a profile, replace the label and plist name with `bot.molt.<profile>`. Remove any legacy `com.propel.*` plists if present.

### Linux (systemd user unit)

Default unit name is `propel-gateway.service` (or `propel-gateway-<profile>.service`):

```bash
systemctl --user disable --now propel-gateway.service
rm -f ~/.config/systemd/user/propel-gateway.service
systemctl --user daemon-reload
```

### Windows (Scheduled Task)

Default task name is `Propel Gateway` (or `Propel Gateway (<profile>)`).
The task script lives under your state dir.

```powershell
schtasks /Delete /F /TN "Propel Gateway"
Remove-Item -Force "$env:USERPROFILE\.propel\gateway.cmd"
```

If you used a profile, delete the matching task name and `~\.propel-<profile>\gateway.cmd`.

## Normal install vs source checkout

### Normal install (install.sh / npm / pnpm / bun)

If you used `https://propel.ai/install.sh` or `install.ps1`, the CLI was installed with `npm install -g propel@latest`.
Remove it with `npm rm -g propel` (or `pnpm remove -g` / `bun remove -g` if you installed that way).

### Source checkout (git clone)

If you run from a repo checkout (`git clone` + `propel ...` / `bun run propel ...`):

1. Uninstall the gateway service **before** deleting the repo (use the easy path above or manual service removal).
2. Delete the repo directory.
3. Remove state + workspace as shown above.
