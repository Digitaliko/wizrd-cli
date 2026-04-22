# wizrd-cli

Global CLI tools for the Digitaliko wizrd ecosystem. Bun + TypeScript.

## Install

```bash
git clone git@github.com:Digitaliko/wizrd-cli.git ~/.wizrd-cli
cd ~/.wizrd-cli && ./install.sh
```

## Commands

### `wizrd` — AI Agent

Spawns Claude Code with the wizrd OS system prompt injected. Auto-detects your operator role and current wizrd level.

```bash
wizrd                          # Interactive claude session with wizrd OS
wizrd "fix the auth bug"       # Non-interactive prompt
wizrd --dry-run --verbose      # Show what would be executed
wizrd --model claude-opus      # Override model
```

### `wizrd cmd` — Fast Commands

Pure filesystem + git reads. No AI. Instant.

```bash
wizrd cmd whoami               # Current operator + role
wizrd cmd level                # Detect L0/L1/L2
wizrd cmd context              # Full: operator + level + worktrees
wizrd cmd clients              # List all clients with services
wizrd cmd clients kiaba        # Single client detail
wizrd cmd services             # L2 services in current L1
wizrd cmd cd kiaba ispediter   # Print path (use: cd $(wizrd cmd cd kiaba ispediter))
wizrd cmd status               # System status dashboard
wizrd cmd worktrees            # Active worktrees
wizrd cmd dirty                # Submodules with uncommitted changes
wizrd cmd branches             # Active branches across submodules
wizrd cmd log                  # Recent worklog entries
wizrd cmd ports                # Port allocations
wizrd cmd doctor               # System health check
```

### `wizrd menu` — Interactive Menu

Numbered picker for common actions.

```bash
wizrd menu
```

### `wizrd config` — Config Generation

```bash
wizrd config sync              # Generate settings.json + .mcp.json from level
wizrd config show              # Dry run
wizrd config doctor            # Check config health
```

### `wizrd superset` — Workspace Lifecycle

```bash
wizrd superset setup           # Init submodules, copy env, allocate ports, install deps
wizrd superset run             # Start dev servers + Docker with allocated ports
wizrd superset teardown        # Kill processes, release ports, Docker down
wizrd superset ports           # Show global port allocation table
wizrd superset init-repo       # Scaffold .superset/ config in current repo
wizrd superset doctor          # Validate config health
```

## How It Works

**Level detection**: Every command reads `## Wizrd Level: L0/L1/L2` from CLAUDE.md in the current directory. This determines behavior — which templates to inject, which config to generate, what setup steps to run.

**Operator detection**: `whoami` maps your system username to a role (Filip=founder, Peter=sales, Samo=dev, Radka=admin, Marko=design). The agent adjusts tone, permissions, and tool access per operator.

**Templates**: The `wizrd` agent assembles a system prompt from markdown templates at `packages/agent/templates/`. Core rules + level rules + operator rules get concatenated and passed to `claude --append-system-prompt`.

## Packages

```
packages/
├── shared/     @wizrd-cli/shared — detect-level, operator, colors, paths
├── agent/      wizrd — spawns claude with system prompt
├── cmd/        wizrd-cmd — fast CLI commands
├── menu/       wizrd-menu — interactive picker
├── config/     wizrd-config — config generation
└── superset/   wizrd-superset — workspace lifecycle
```
