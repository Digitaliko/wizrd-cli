#!/usr/bin/env bun
/**
 * wizrd-menu — Interactive menu for the wizrd OS.
 * Presents options, user picks by number.
 */

import { detectOperator, detectLevel, BOLD, DIM, GREEN, CYAN, YELLOW, RESET } from "@wizrd-cli/shared";
import * as readline from "readline";

interface MenuItem {
  label: string;
  command: string[];
  description: string;
}

const MENU_ITEMS: MenuItem[] = [
  { label: "Open agent", command: ["wizrd"], description: "Start wizrd agent session" },
  { label: "Status", command: ["wizrd-cmd", "status"], description: "System status dashboard" },
  { label: "Who am I", command: ["wizrd-cmd", "whoami"], description: "Current operator + role" },
  { label: "Context", command: ["wizrd-cmd", "context"], description: "Full context overview" },
  { label: "Clients", command: ["wizrd-cmd", "clients"], description: "List all clients" },
  { label: "Dirty repos", command: ["wizrd-cmd", "dirty"], description: "Check uncommitted changes" },
  { label: "Worktrees", command: ["wizrd-cmd", "worktrees"], description: "Active worktrees" },
  { label: "Branches", command: ["wizrd-cmd", "branches"], description: "Active branches" },
  { label: "Worklog", command: ["wizrd-cmd", "log"], description: "Recent worklog entries" },
  { label: "Config sync", command: ["wizrd-config", "sync"], description: "Generate settings + MCPs" },
  { label: "Doctor", command: ["wizrd-cmd", "doctor"], description: "System health check" },
  { label: "Superset setup", command: ["wizrd-superset", "setup"], description: "Init workspace" },
];

async function showMenu(): Promise<void> {
  const op = detectOperator();
  const info = await detectLevel();
  const levelColor = info.level === "L0" ? CYAN : info.level === "L1" ? GREEN : YELLOW;

  console.log("");
  console.log(`  ${BOLD}WIZRD MENU${RESET}  ${DIM}${op.name} @ ${levelColor}${info.level}${RESET}`);
  console.log(`  ${DIM}${"─".repeat(40)}${RESET}`);
  console.log("");

  for (let i = 0; i < MENU_ITEMS.length; i++) {
    const item = MENU_ITEMS[i];
    const num = `${i + 1}`.padStart(2);
    console.log(`  ${GREEN}${num}${RESET}. ${item.label.padEnd(18)} ${DIM}${item.description}${RESET}`);
  }
  console.log(`  ${DIM} q. Quit${RESET}`);
  console.log("");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question(`  ${BOLD}>${RESET} `, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });

  if (answer === "q" || answer === "Q" || answer === "") {
    process.exit(0);
  }

  const idx = parseInt(answer, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= MENU_ITEMS.length) {
    console.error(`  Invalid selection: ${answer}`);
    process.exit(1);
  }

  const selected = MENU_ITEMS[idx];
  console.log("");

  const proc = Bun.spawn(selected.command, {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    env: process.env as Record<string, string>,
  });

  const exitCode = await proc.exited;
  process.exit(exitCode);
}

await showMenu();
