#!/usr/bin/env bun
/**
 * wizrd-cmd — Fast CLI commands for the wizrd OS.
 * Pure filesystem + git reads, no AI.
 */

import { whoami } from "./commands/whoami.ts";
import { level } from "./commands/level.ts";
import { context } from "./commands/context.ts";
import { clients } from "./commands/clients.ts";
import { services } from "./commands/services.ts";
import { cd } from "./commands/cd.ts";
import { status } from "./commands/status.ts";
import { worktrees } from "./commands/worktrees.ts";
import { dirty } from "./commands/dirty.ts";
import { branches } from "./commands/branches.ts";
import { log } from "./commands/log.ts";
import { ports } from "./commands/ports.ts";
import { doctor } from "./commands/doctor.ts";

import { BOLD, DIM, GREEN, RESET } from "@wizrd-cli/shared";

const COMMANDS: Record<string, (args: string[]) => Promise<void>> = {
  whoami: () => whoami(),
  level: () => level(),
  context: () => context(),
  clients: (args) => clients(args),
  services: () => services(),
  cd: (args) => cd(args),
  status: () => status(),
  worktrees: () => worktrees(),
  dirty: () => dirty(),
  branches: () => branches(),
  log: (args) => log(args),
  ports: () => ports(),
  doctor: () => doctor(),
};

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command || command === "--help" || command === "-h") {
  console.log("");
  console.log(`${BOLD}  wizrd cmd${RESET} ${DIM}— fast CLI commands${RESET}`);
  console.log("");
  console.log("  Commands:");
  console.log(`    ${GREEN}whoami${RESET}        Current operator + role`);
  console.log(`    ${GREEN}level${RESET}         Detect L0/L1/L2`);
  console.log(`    ${GREEN}context${RESET}       Full: operator + level + worktrees`);
  console.log(`    ${GREEN}clients${RESET}       List all clients (or: clients <name>)`);
  console.log(`    ${GREEN}services${RESET}      L2 services in current L1`);
  console.log(`    ${GREEN}cd${RESET}            Print path: cd $(wizrd cmd cd kiaba ispediter)`);
  console.log(`    ${GREEN}status${RESET}        System status dashboard`);
  console.log(`    ${GREEN}worktrees${RESET}     Active worktrees`);
  console.log(`    ${GREEN}dirty${RESET}         Submodules with uncommitted changes`);
  console.log(`    ${GREEN}branches${RESET}      Active branches across submodules`);
  console.log(`    ${GREEN}log${RESET}           Recent worklog entries (or: log <client>)`);
  console.log(`    ${GREEN}ports${RESET}         Port allocations`);
  console.log(`    ${GREEN}doctor${RESET}        System health check`);
  console.log("");
  process.exit(0);
}

const handler = COMMANDS[command];
if (!handler) {
  console.error(`Unknown command: ${command}`);
  console.error(`Run 'wizrd cmd --help' for usage.`);
  process.exit(1);
}

try {
  await handler(args);
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
