#!/usr/bin/env bun
/**
 * wizrd — AI Operating System CLI
 *
 * Top-level entrypoint that delegates to subpackages
 * or shows system status when run bare.
 */

import { existsSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";

// Colors
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

const SUBCOMMANDS: Record<string, { bin: string; description: string }> = {
  superset: { bin: "wizrd-superset", description: "Workspace lifecycle (setup/run/teardown/ports)" },
  config: { bin: "wizrd-config", description: "Generate settings.json + .mcp.json from level" },
};

// ---- Level detection (inline, no import needed) ----

interface LevelInfo {
  level: string;
  label: string;
}

async function detectLevel(dir: string): Promise<LevelInfo> {
  const claudeMd = join(dir, "CLAUDE.md");
  if (!existsSync(claudeMd)) return { level: "unknown", label: "No CLAUDE.md" };
  const content = await Bun.file(claudeMd).text();
  const match = content.match(/##\s*Wizrd Level:\s*(L[012])\s*\(([^)]+)\)/i);
  if (!match) return { level: "unknown", label: "No Wizrd Level in CLAUDE.md" };
  return { level: match[1], label: match[2] };
}

// ---- Status display ----

async function showStatus(): Promise<void> {
  const dir = process.cwd();
  const info = await detectLevel(dir);

  console.log("");
  console.log(`${BOLD}  wizrd${RESET} ${DIM}— AI Operating System${RESET}`);
  console.log("");

  // Level
  const levelColor = info.level === "L0" ? CYAN : info.level === "L1" ? GREEN : info.level === "L2" ? YELLOW : RED;
  console.log(`  ${DIM}Level:${RESET}     ${levelColor}${info.level}${RESET} ${DIM}(${info.label})${RESET}`);
  console.log(`  ${DIM}Directory:${RESET} ${DIM}${dir}${RESET}`);

  // Operator
  const user = Bun.spawnSync(["whoami"], { stdout: "pipe" }).stdout.toString().trim();
  console.log(`  ${DIM}Operator:${RESET}  ${user}`);

  // Port allocations
  const registryPath = join(homedir(), ".wizrd-cli", "state", "port-registry.json");
  if (existsSync(registryPath)) {
    const registry = await Bun.file(registryPath).json();
    const allocs = Object.values(registry.allocations || {}) as any[];
    const active = allocs.filter((a: any) => existsSync(a.workspacePath));
    if (active.length > 0) {
      console.log(`  ${DIM}Ports:${RESET}     ${active.length} workspace(s) active`);
      for (const a of active) {
        const portsStr = Object.entries(a.ports).map(([n, p]) => `${n}:${p}`).join(", ");
        console.log(`             ${DIM}${a.workspace}${RESET} → ${portsStr}`);
      }
    } else {
      console.log(`  ${DIM}Ports:${RESET}     No active allocations`);
    }
  }

  // Config health (quick check)
  const settingsPath = join(dir, ".claude", "settings.json");
  const mcpPath = join(dir, ".mcp.json");
  const hasSettings = existsSync(settingsPath);
  const hasMcp = existsSync(mcpPath);
  const configStatus = hasSettings && hasMcp ? `${GREEN}ok${RESET}` : `${YELLOW}run 'wizrd config sync'${RESET}`;
  console.log(`  ${DIM}Config:${RESET}    ${configStatus}`);

  // Superset
  const supersetPath = join(dir, ".superset", "config.json");
  const hasSupersetConfig = existsSync(supersetPath);
  const supersetStatus = hasSupersetConfig ? `${GREEN}ok${RESET}` : `${YELLOW}run 'wizrd superset init-repo'${RESET}`;
  console.log(`  ${DIM}Superset:${RESET}  ${supersetStatus}`);

  console.log("");
}

// ---- Help ----

function showHelp(): void {
  console.log("");
  console.log(`${BOLD}  wizrd${RESET} ${DIM}— AI Operating System CLI${RESET}`);
  console.log("");
  console.log("  Usage:");
  console.log(`    ${BOLD}wizrd${RESET}                    Show status`);
  console.log(`    ${BOLD}wizrd <command>${RESET} [args]    Run a subcommand`);
  console.log(`    ${BOLD}wizrd help${RESET}               Show this help`);
  console.log("");
  console.log("  Commands:");
  for (const [name, info] of Object.entries(SUBCOMMANDS)) {
    console.log(`    ${GREEN}${name.padEnd(12)}${RESET} ${info.description}`);
  }
  console.log("");
  console.log("  Examples:");
  console.log(`    ${DIM}wizrd superset setup${RESET}     Init workspace (submodules, env, ports)`);
  console.log(`    ${DIM}wizrd superset ports${RESET}     Show port allocations`);
  console.log(`    ${DIM}wizrd config sync${RESET}        Generate settings + MCPs`);
  console.log(`    ${DIM}wizrd config doctor${RESET}      Check config health`);
  console.log("");
}

// ---- Doctor (runs all package doctors) ----

async function runDoctor(): Promise<void> {
  console.log("");
  console.log(`${BOLD}  wizrd doctor${RESET} ${DIM}— system health check${RESET}`);
  console.log("");

  for (const [name, info] of Object.entries(SUBCOMMANDS)) {
    console.log(`  ${CYAN}--- ${name} ---${RESET}`);
    const proc = Bun.spawn([info.bin, "doctor"], {
      stdout: "inherit",
      stderr: "inherit",
      env: process.env as Record<string, string>,
    });
    await proc.exited;
    console.log("");
  }
}

// ---- Main ----

const command = process.argv[2];

if (!command) {
  await showStatus();
  process.exit(0);
}

if (command === "help" || command === "--help" || command === "-h") {
  showHelp();
  process.exit(0);
}

if (command === "doctor") {
  await runDoctor();
  process.exit(0);
}

if (command === "status") {
  await showStatus();
  process.exit(0);
}

// Delegate to subcommand
const sub = SUBCOMMANDS[command];
if (!sub) {
  console.error(`Unknown command: ${command}`);
  console.error(`Run 'wizrd help' for usage.`);
  process.exit(1);
}

// Pass remaining args to the subcommand binary
const args = process.argv.slice(3);
const proc = Bun.spawn([sub.bin, ...args], {
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
  env: process.env as Record<string, string>,
});

const exitCode = await proc.exited;
process.exit(exitCode);
