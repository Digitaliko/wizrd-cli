#!/usr/bin/env bun
/**
 * wizrd — AI Operating System agent
 *
 * Spawns Claude Code with the wizrd OS system prompt injected.
 * Delegates to subcommands: cmd, menu, config, superset.
 */

import { detectLevel, detectOperator, BOLD, DIM, CYAN, GREEN, RESET } from "@wizrd-cli/shared";
import { assemblePrompt } from "./prompt.ts";
import { getAllowedTools, getPermissionMode } from "./permissions.ts";

const SUBCOMMANDS: Record<string, string> = {
  cmd: "wizrd-cmd",
  menu: "wizrd-menu",
  config: "wizrd-config",
  superset: "wizrd-superset",
};

function showHelp(): void {
  console.log("");
  console.log(`${BOLD}  wizrd${RESET} ${DIM}— AI Operating System${RESET}`);
  console.log("");
  console.log("  Usage:");
  console.log(`    ${BOLD}wizrd${RESET}                       Open interactive Claude session with wizrd OS`);
  console.log(`    ${BOLD}wizrd${RESET} "prompt"               Run prompt non-interactively`);
  console.log(`    ${BOLD}wizrd cmd${RESET} <command>          Fast CLI commands (whoami, clients, status...)`);
  console.log(`    ${BOLD}wizrd menu${RESET}                   Interactive menu`);
  console.log(`    ${BOLD}wizrd config${RESET} <command>       Config generation (sync, show, doctor)`);
  console.log(`    ${BOLD}wizrd superset${RESET} <command>     Workspace lifecycle (setup, run, teardown)`);
  console.log("");
  console.log("  Agent flags:");
  console.log(`    ${DIM}--dry-run${RESET}                   Show claude command without executing`);
  console.log(`    ${DIM}--model <model>${RESET}              Override model (default: claude-sonnet-4-5-20250514)`);
  console.log(`    ${DIM}--verbose${RESET}                   Show assembled prompt before launching`);
  console.log("");
  console.log("  Examples:");
  console.log(`    ${DIM}wizrd${RESET}                         Start wizrd agent session`);
  console.log(`    ${DIM}wizrd "fix the auth bug"${RESET}      Non-interactive prompt`);
  console.log(`    ${DIM}wizrd cmd whoami${RESET}              Show current operator`);
  console.log(`    ${DIM}wizrd cmd clients${RESET}             List all clients`);
  console.log(`    ${DIM}wizrd menu${RESET}                    Interactive picker`);
  console.log("");
}

// ---- Main ----

const args = process.argv.slice(2);
const firstArg = args[0];

// Help
if (firstArg === "help" || firstArg === "--help" || firstArg === "-h") {
  showHelp();
  process.exit(0);
}

// Delegate to subcommands
if (firstArg && SUBCOMMANDS[firstArg]) {
  const bin = SUBCOMMANDS[firstArg];
  const subArgs = args.slice(1);
  const proc = Bun.spawn([bin, ...subArgs], {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    env: process.env as Record<string, string>,
  });
  const exitCode = await proc.exited;
  process.exit(exitCode);
}

// ---- pipeline subcommand (inline, not delegated) ----
if (firstArg === "pipeline") {
  const verb = args[1];
  if (verb === "enable") {
    const { runPipelineEnable } = await import("./commands/pipeline-enable.ts");
    const force = args.includes("--force");
    try {
      await runPipelineEnable({
        cwd: process.cwd(),
        force,
      });
      process.exit(0);
    } catch (err) {
      console.error(`${BOLD}Error:${RESET} ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  }
  if (verb === "init") {
    const { runPipelineInit } = await import("./commands/pipeline-init.ts");
    const filterKind = (process.env.WIZRD_FILTER_KIND ?? "assignee") as
      | "assignee"
      | "label"
      | "none";
    const filterValue = process.env.WIZRD_FILTER_VALUE ?? "";
    const baseBranch = process.env.WIZRD_BASE_BRANCH ?? "main";
    const docsRoot = process.env.WIZRD_DOCS_ROOT ?? "docs";
    const force = args.includes("--force");
    try {
      const { path } = await runPipelineInit({
        cwd: process.cwd(),
        filterKind,
        filterValue,
        baseBranch,
        docsRoot,
        force,
      });
      console.log(`${GREEN}✓${RESET} Wrote ${path}`);
      process.exit(0);
    } catch (err) {
      console.error(`${BOLD}Error:${RESET} ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  }
  console.error(`${BOLD}Error:${RESET} unknown pipeline verb "${verb ?? ""}"`);
  console.error("");
  console.error("  Usage:");
  console.error(`    ${BOLD}wizrd pipeline enable${RESET} [--force]  One-command bootstrap (recommended)`);
  console.error(`    ${BOLD}wizrd pipeline init${RESET}   [--force]  Low-level: just write the workflow file`);
  console.error("");
  console.error("  Env vars:");
  console.error(`    WIZRD_FILTER_KIND       assignee | label | none (default: assignee)`);
  console.error(`    WIZRD_FILTER_VALUE      filter value (default: empty)`);
  console.error(`    WIZRD_BASE_BRANCH       PR base branch (default: main)`);
  console.error(`    WIZRD_DOCS_ROOT         docs root for gardening (default: docs)`);
  process.exit(1);
}

// ---- Agent mode: spawn claude with wizrd OS ----

// Parse agent-specific flags
let dryRun = false;
let verbose = false;
let model = "";
const promptParts: string[] = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--dry-run") {
    dryRun = true;
  } else if (args[i] === "--verbose") {
    verbose = true;
  } else if (args[i] === "--model" && args[i + 1]) {
    model = args[++i];
  } else {
    promptParts.push(args[i]);
  }
}

const userPrompt = promptParts.join(" ");

// Detect context
const dir = process.cwd();
const levelInfo = await detectLevel(dir);
const operator = detectOperator();

// Assemble system prompt
const systemPrompt = await assemblePrompt(levelInfo.level, operator.name);

// Build allowed tools
const allowedTools = getAllowedTools(operator);
const permissionMode = getPermissionMode(operator);

// Build claude command
const claudeArgs: string[] = [];

// Append system prompt (keeps Claude Code defaults)
claudeArgs.push("--append-system-prompt", systemPrompt);

// Allowed tools
if (allowedTools.length > 0) {
  for (const tool of allowedTools) {
    claudeArgs.push("--allowedTools", tool);
  }
}

// Permission mode
claudeArgs.push("--permission-mode", permissionMode);

// Model override
if (model) {
  claudeArgs.push("--model", model);
}

// Non-interactive mode if prompt provided
if (userPrompt) {
  claudeArgs.push("-p", userPrompt);
}

if (verbose) {
  console.log(`${CYAN}${BOLD}wizrd agent${RESET}`);
  console.log(`${DIM}  Operator:${RESET}  ${operator.name} (${operator.role})`);
  console.log(`${DIM}  Level:${RESET}     ${levelInfo.level} (${levelInfo.label})`);
  console.log(`${DIM}  Mode:${RESET}      ${permissionMode}`);
  console.log(`${DIM}  Tools:${RESET}     ${allowedTools.length} allowed`);
  console.log(`${DIM}  Prompt:${RESET}    ${userPrompt || "(interactive)"}`);
  console.log("");
}

if (dryRun) {
  console.log(`${BOLD}claude${RESET} \\`);
  console.log(`  --append-system-prompt "${DIM}[${systemPrompt.length} chars]${RESET}" \\`);
  for (const tool of allowedTools) {
    console.log(`  --allowedTools "${tool}" \\`);
  }
  console.log(`  --permission-mode ${permissionMode}`);
  if (userPrompt) {
    console.log(`  -p "${userPrompt}"`);
  }
  process.exit(0);
}

// Launch claude
const proc = Bun.spawn(["claude", ...claudeArgs], {
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
  cwd: dir,
  env: process.env as Record<string, string>,
});

const exitCode = await proc.exited;
process.exit(exitCode);
