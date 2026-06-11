# wizrd-cli

Global CLI tools for the Digitaliko wizrd ecosystem. Bun + TypeScript.

## Wizrd Level: L0 (Global Tool)

This is a standalone global CLI — not a submodule of digitaliko-wizrd. It gets installed at `~/.wizrd-cli` and symlinked to PATH.

## Architecture — 5 Packages

```
wizrd                    → packages/agent/     Spawns claude with wizrd OS system prompt
wizrd cmd <command>      → packages/cmd/       Fast CLI commands (no AI)
wizrd menu               → packages/menu/      Interactive menu picker
wizrd config <command>   → packages/config/    Config generation (sync, show, doctor)
wizrd superset <command> → packages/superset/  Workspace lifecycle (setup, run, teardown)
```

All packages share `@wizrd-cli/shared` for level detection, operator mapping, colors, and path utilities.

### `packages/agent/` — wizrd (main entry point)

Spawns `claude` CLI with the wizrd OS system prompt injected via `--append-system-prompt`. Detects operator (whoami), level (CLAUDE.md), and assembles the prompt from templates.

**Templates** (in `packages/agent/templates/`):
- `core.md` — Always injected. Navigation rules, workflow, guardrails, brand voice.
- `l0.md` / `l1.md` / `l2.md` — Level-specific rules. Injected based on detected level.
- `operator-{name}.md` — Operator-specific tone, access, behavior. Injected based on whoami.

**Flags:**
- `wizrd` — Interactive claude session with wizrd OS
- `wizrd "prompt"` — Non-interactive (`claude -p`)
- `wizrd --dry-run` — Show assembled command without executing
- `wizrd --verbose` — Show context before launching
- `wizrd --model <model>` — Override model
- `wizrd pipeline enable` — One-command bootstrap: detect repo, seed labels, set OAuth secret, generate `.github/workflows/wizrd-pipeline.yml`, branch + commit + push + PR. Refuses on L0. Env overrides: `WIZRD_FILTER_KIND` / `WIZRD_FILTER_VALUE` / `WIZRD_BASE_BRANCH` / `WIZRD_DOCS_ROOT`. Pass `--force` to overwrite an existing pipeline file.
- `wizrd pipeline init` — Low-level: just write the per-repo workflow file from the template. Same env vars. Skips secret + label-seed + PR steps. Useful for tests and re-rendering.

### `packages/cmd/` — wizrd cmd (fast commands)

Pure filesystem + git reads. No AI involved. Instant results.

- `wizrd cmd whoami` — Current operator + role + permissions
- `wizrd cmd level` — Detect L0/L1/L2 + context
- `wizrd cmd context` — Full: operator + level + worktrees
- `wizrd cmd clients [name]` — List all or show single client
- `wizrd cmd services` — L2 services in current L1
- `wizrd cmd cd <client> [service]` — Print path (use: `cd $(wizrd cmd cd kiaba ispediter)`)
- `wizrd cmd status` — System status dashboard
- `wizrd cmd worktrees` — Active worktrees across levels
- `wizrd cmd dirty` — Submodules with uncommitted changes
- `wizrd cmd branches` — Active branches across submodules
- `wizrd cmd log [client]` — Recent worklog entries
- `wizrd cmd ports` — Port allocations (delegates to wizrd-superset)
- `wizrd cmd doctor` — System health check (runs all package doctors)

### `packages/menu/` — wizrd menu (interactive picker)

Numbered menu with common actions. Delegates to other commands.

### `packages/shared/` — @wizrd-cli/shared

Shared utilities used by all packages:
- `detect-level.ts` — Read CLAUDE.md for `## Wizrd Level: L0/L1/L2`
- `operator.ts` — Map `whoami` to operator role, permissions, tone
- `colors.ts` — ANSI color constants
- `paths.ts` — Resolve L0 root, client paths, service paths

### `packages/superset/` — wizrd-superset

Workspace lifecycle for Superset workspaces. See HOW-TO.md in digitaliko-wizrd.

### `packages/config/` — wizrd-config

Config generation. Reads level → loads template → merges local overrides → writes settings.json + .mcp.json.

## Development

```bash
bun install
bun run packages/agent/src/index.ts --help    # test agent
bun run packages/cmd/src/index.ts whoami      # test cmd
./install.sh                                   # re-symlink binaries
```

## Architecture Decisions

- **Pure Bun + TypeScript** — no external CLI framework, zero dependencies beyond bun-types
- **Templates, not hardcoded prompts** — system prompt assembled from .md files, easy to edit
- **Shared lib** — `@wizrd-cli/shared` prevents duplication across packages
- **Level detection is the key** — everything (agent, cmd, config, superset) reads `## Wizrd Level` from CLAUDE.md

## Pipeline composites (delivery harness)

The `.github/workflows/wizrd-stage-*.yml` + `.github/workflows/wizrd-tagger.yml` + `.github/actions/wizrd-transition/` composites are the **delivery pipeline** — a label-driven cascade (triage → plan → implement → review-loop → verify → doc-gardening) consumed by `@v1` from every Digitaliko repo that opts in.

- **Public-API contract:** `.github/STABILITY.md` spells out additive vs. breaking changes. Inputs, secret names, label namespace are all contract.
- **Bootstrap:** operators run `wizrd pipeline enable` in their repo; the composites do the rest.
- **Bump rhythm:** additive changes — merge to main, then `git tag -fa v1 && git push --force-with-lease origin v1`.
- **Deprecation:** `wizrd-agent.yml` and `wizrd-review.yml` are superseded by the cascade and will be removed once all repos migrate.

See `.github/STABILITY.md` for the contract.
