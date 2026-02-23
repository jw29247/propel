---
summary: "CLI reference for `propel agents` (list/add/delete/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `propel agents`

Manage isolated agents (workspaces + auth + routing).

Related:

- Multi-agent routing: [Multi-Agent Routing](/concepts/multi-agent)
- Agent workspace: [Agent workspace](/concepts/agent-workspace)

## Examples

```bash
propel agents list
propel agents add work --workspace ~/.propel/workspace-work
propel agents set-identity --workspace ~/.propel/workspace --from-identity
propel agents set-identity --agent main --avatar avatars/propel.png
propel agents delete work
```

## Identity files

Each agent workspace can include an `IDENTITY.md` at the workspace root:

- Example path: `~/.propel/workspace/IDENTITY.md`
- `set-identity --from-identity` reads from the workspace root (or an explicit `--identity-file`)

Avatar paths resolve relative to the workspace root.

## Set identity

`set-identity` writes fields into `agents.list[].identity`:

- `name`
- `theme`
- `emoji`
- `avatar` (workspace-relative path, http(s) URL, or data URI)

Load from `IDENTITY.md`:

```bash
propel agents set-identity --workspace ~/.propel/workspace --from-identity
```

Override fields explicitly:

```bash
propel agents set-identity --agent main --name "Propel" --emoji "🦞" --avatar avatars/propel.png
```

Config sample:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "Propel",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/propel.png",
        },
      },
    ],
  },
}
```
