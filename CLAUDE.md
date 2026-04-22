# wizrd-cli

Global CLI tools for the Digitaliko wizrd ecosystem. Bun + TypeScript.

## Wizrd Level: L0 (Global Tool)

This is a standalone global CLI — not a submodule of digitaliko-wizrd. It gets installed at `~/.wizrd-cli` and symlinked to PATH.

## Packages

### `packages/superset/` — Superset Integration
Handles setup/run/teardown lifecycle for any wizrd repo (L0/L1/L2) running inside Superset workspaces.

**Commands:**
- `wizrd-superset setup` — Init submodules, copy .env, allocate ports, install deps
- `wizrd-superset run` — Start dev servers + Docker with allocated ports
- `wizrd-superset teardown` — Kill processes, release ports, Docker down
- `wizrd-superset ports` — Show global port allocation table
- `wizrd-superset init-repo` — Scaffold .superset/ config in current repo
- `wizrd-superset doctor` — Validate config health

**Key concepts:**
- Auto-detects wizrd level by reading CLAUDE.md `## Wizrd Level:` line
- Global port registry at `~/.wizrd-cli/state/port-registry.json`
- Port offsets in increments of 100 (0, 100, 200...) prevent collisions
- Every repo gets the same 3-line `.superset/config.json` pointing to `wizrd-superset`

## Development

```bash
bun install
bun run packages/superset/src/index.ts setup    # test locally
bun test                                         # run tests
bun build                                        # compile
```

## Architecture

- Pure Bun + TypeScript, no external CLI framework
- `Bun.$` for shell commands
- JSON file for port registry state
- Zero dependencies beyond bun-types
