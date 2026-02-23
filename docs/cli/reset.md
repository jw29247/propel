---
summary: "CLI reference for `propel reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `propel reset`

Reset local config/state (keeps the CLI installed).

```bash
propel reset
propel reset --dry-run
propel reset --scope config+creds+sessions --yes --non-interactive
```
