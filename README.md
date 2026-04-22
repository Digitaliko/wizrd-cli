# wizrd-cli

Global CLI tools for the Digitaliko wizrd ecosystem. Bun + TypeScript.

## Install

```bash
git clone git@github.com:Digitaliko/wizrd-cli.git ~/.wizrd-cli
cd ~/.wizrd-cli && ./install.sh
```

## Packages

### `wizrd-superset` — Superset Workspace Integration

Handles setup/run/teardown lifecycle for any wizrd repo (L0/L1/L2) running inside [Superset](https://superset.sh) workspaces.

```bash
wizrd-superset setup       # Init submodules, copy env, allocate ports, install deps
wizrd-superset run         # Start dev servers + Docker with allocated ports
wizrd-superset teardown    # Kill processes, release ports, Docker down
wizrd-superset ports       # Show global port allocation table
wizrd-superset init-repo   # Scaffold .superset/ config in current repo
wizrd-superset doctor      # Validate config health
```

**Auto-detects wizrd level** from CLAUDE.md and adjusts behavior:
- **L0** (Company): Init all submodules, skip dep install
- **L1** (Client): Init L2 submodules, install deps per service
- **L2** (Service): Install deps, start dev server

**Port isolation**: Global port registry ensures multiple workspaces never collide. Offsets in increments of 100.

### Adding to a repo

Run `wizrd-superset init-repo` in any wizrd repo to scaffold the config:

```
.superset/config.json      # Lifecycle hooks (same everywhere)
.superset/ports.json       # Declared service ports
.worktreeinclude           # Env files to copy into worktrees
```
