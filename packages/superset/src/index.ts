#!/usr/bin/env bun
/**
 * wizrd-superset — Superset integration CLI for the Digitaliko wizrd ecosystem.
 *
 * Usage:
 *   wizrd-superset setup       Init submodules, copy env, allocate ports, install deps
 *   wizrd-superset run         Start dev servers + Docker with allocated ports
 *   wizrd-superset teardown    Kill processes, release ports, Docker down
 *   wizrd-superset ports       Show global port allocation table
 *   wizrd-superset init-repo   Scaffold .superset/ config in current repo
 *   wizrd-superset doctor      Validate config health
 */

import { setup } from "./commands/setup.ts";
import { run } from "./commands/run.ts";
import { teardown } from "./commands/teardown.ts";
import { ports } from "./commands/ports.ts";
import { initRepo } from "./commands/init-repo.ts";
import { doctor } from "./commands/doctor.ts";

const COMMANDS: Record<string, () => Promise<void>> = {
  setup,
  run,
  teardown,
  ports,
  "init-repo": initRepo,
  doctor,
};

const command = process.argv[2];

if (!command || command === "--help" || command === "-h") {
  console.log(`wizrd-superset — Superset integration for wizrd repos

Usage:
  wizrd-superset <command>

Commands:
  setup       Init submodules, copy env, allocate ports, install deps
  run         Start dev servers + Docker with allocated ports
  teardown    Kill processes, release ports, Docker down
  ports       Show global port allocation table
  init-repo   Scaffold .superset/ config in current repo
  doctor      Validate config health

Environment:
  SUPERSET_ROOT_PATH       Path to main repo (set by Superset)
  SUPERSET_WORKSPACE_NAME  Workspace name (set by Superset)
  SUPERSET_WORKSPACE_PATH  Workspace directory (set by Superset)
`);
  process.exit(0);
}

const handler = COMMANDS[command];
if (!handler) {
  console.error(`Unknown command: ${command}`);
  console.error(`Run 'wizrd-superset --help' for usage.`);
  process.exit(1);
}

try {
  await handler();
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
