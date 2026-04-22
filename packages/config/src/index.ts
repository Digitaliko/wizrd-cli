#!/usr/bin/env bun
/**
 * wizrd-config — Generate unified .claude/settings.json and .mcp.json
 * for any wizrd repo based on its level (L0/L1/L2).
 *
 * Usage:
 *   wizrd-config sync     Generate .claude/settings.json + .mcp.json
 *   wizrd-config show     Show what would be generated (dry run)
 *   wizrd-config doctor   Check for stale/conflicting config
 */

import { sync } from "./commands/sync.ts";
import { show } from "./commands/show.ts";
import { doctor } from "./commands/doctor.ts";

const COMMANDS: Record<string, () => Promise<void>> = {
  sync,
  show,
  doctor,
};

const command = process.argv[2];

if (!command || command === "--help" || command === "-h") {
  console.log(`wizrd-config — Unified config generator for wizrd repos

Usage:
  wizrd-config <command>

Commands:
  sync     Generate .claude/settings.json + .mcp.json from level + local overrides
  show     Show what would be generated (dry run)
  doctor   Check for stale/conflicting config

How it works:
  1. Reads CLAUDE.md to detect wizrd level (L0/L1/L2)
  2. Loads base template for that level
  3. Merges with local overrides (.claude/settings.local.json, .mcp.local.json)
  4. Writes the final .claude/settings.json and .mcp.json

Local overrides (gitignored):
  .claude/settings.local.json   Extra permissions, hooks
  .mcp.local.json               Extra MCP servers
`);
  process.exit(0);
}

const handler = COMMANDS[command];
if (!handler) {
  console.error(`Unknown command: ${command}`);
  console.error(`Run 'wizrd-config --help' for usage.`);
  process.exit(1);
}

try {
  await handler();
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
