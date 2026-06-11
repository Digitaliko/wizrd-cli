import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline";

import { runPipelineInit, type FilterKind } from "./pipeline-init.ts";

export interface EnableContext {
  repo: string;
  level: "L0" | "L1" | "L2";
  defaultBranch: string;
  docsRoot: string;
  secretPresent: boolean;
}

export interface GhAdapter {
  repoView(): Promise<{ nameWithOwner: string; defaultBranchRef: { name: string } }>;
  secretExists(name: string): Promise<boolean>;
}

const REAL_GH: GhAdapter = {
  async repoView() {
    const out = execFileSync("gh", ["repo", "view", "--json", "nameWithOwner,defaultBranchRef"], {
      encoding: "utf-8",
    });
    return JSON.parse(out);
  },
  async secretExists(name) {
    try {
      const out = execFileSync("gh", ["secret", "list", "--json", "name"], { encoding: "utf-8" });
      const list = JSON.parse(out) as Array<{ name: string }>;
      return list.some((s) => s.name === name);
    } catch {
      return false;
    }
  },
};

export async function detectEnableContext(opts: {
  cwd: string;
  gh?: GhAdapter;
}): Promise<EnableContext> {
  const gh = opts.gh ?? REAL_GH;
  const view = await gh.repoView();
  const docsRoot = detectDocsRoot(opts.cwd);
  const level = detectLevel(opts.cwd);
  const secretPresent = await gh.secretExists("CLAUDE_CODE_OAUTH_TOKEN");
  return {
    repo: view.nameWithOwner,
    level,
    defaultBranch: view.defaultBranchRef.name,
    docsRoot,
    secretPresent,
  };
}

function detectDocsRoot(cwd: string): string {
  for (const candidate of ["docs", "knowledge-base", "documentation"]) {
    if (existsSync(join(cwd, candidate))) return candidate;
  }
  return "docs";
}

function detectLevel(cwd: string): "L0" | "L1" | "L2" {
  const claudePath = join(cwd, "CLAUDE.md");
  if (!existsSync(claudePath)) return "L2";
  const content = readFileSync(claudePath, "utf-8");
  const match = content.match(/##\s+Wizrd\s+Level:\s*(L0|L1|L2)/i);
  if (match) return match[1].toUpperCase() as "L0" | "L1" | "L2";
  return "L2";
}

// ─── Orchestration ───────────────────────────────────────────────────

export interface EnableOptions {
  cwd: string;
  filterKind?: FilterKind;
  filterValue?: string;
  force?: boolean;
  /** Skip the seed-labels.sh call (for tests / dry runs). */
  skipSeedLabels?: boolean;
  /** Skip the secret prompt + set (for tests / dry runs). */
  skipSecret?: boolean;
  /** Skip git branch/commit/push/PR (for tests / dry runs). */
  skipPr?: boolean;
  gh?: GhAdapter;
}

export async function runPipelineEnable(opts: EnableOptions): Promise<void> {
  const ctx = await detectEnableContext({ cwd: opts.cwd, gh: opts.gh });

  if (ctx.level === "L0") {
    throw new Error("Pipeline enable refused: L0 (company) repos do not run code pipelines.");
  }

  log("✓", `Detected repo: ${ctx.repo} (${ctx.level})`);
  log("✓", `Default branch: ${ctx.defaultBranch}`);
  log("✓", `Docs root: ${ctx.docsRoot}${existsSync(join(opts.cwd, ctx.docsRoot)) ? " (found)" : " (will be created if needed)"}`);

  const filterKind = opts.filterKind ?? (await promptFilterKind());
  const filterValue =
    opts.filterValue ?? (filterKind === "none" ? "" : await promptFilterValue(filterKind));

  if (!opts.skipSeedLabels) {
    log("…", `Seeding labels on ${ctx.repo}...`);
    runCmd("bash", [seedLabelsScript(), ctx.level, ctx.repo]);
    log("✓", "Labels seeded");
  }

  if (!opts.skipSecret && !ctx.secretPresent) {
    const setIt = await promptYesNo(
      "CLAUDE_CODE_OAUTH_TOKEN secret not found. Set it now?",
      true,
    );
    if (setIt) {
      runCmd("gh", ["secret", "set", "CLAUDE_CODE_OAUTH_TOKEN", "--repo", ctx.repo]);
      log("✓", "Secret set");
    } else {
      log("!", "Skipping secret — pipeline will fail until you set it.");
    }
  } else if (ctx.secretPresent) {
    log("✓", "CLAUDE_CODE_OAUTH_TOKEN already set");
  }

  const { path } = await runPipelineInit({
    cwd: opts.cwd,
    filterKind,
    filterValue,
    baseBranch: ctx.defaultBranch,
    docsRoot: ctx.docsRoot,
    force: opts.force,
  });
  log("✓", `Wrote ${path}`);

  if (!opts.skipPr) {
    const branch = "feat/wizrd-pipeline";
    runCmd("git", ["checkout", "-b", branch], opts.cwd);
    runCmd("git", ["add", ".github/workflows/wizrd-pipeline.yml"], opts.cwd);
    runCmd("git", ["commit", "-m", "feat(ci): enable wizrd delivery pipeline"], opts.cwd);
    runCmd("git", ["push", "-u", "origin", branch], opts.cwd);
    const url = runCmdCapture("gh", [
      "pr", "create",
      "--title", "feat(ci): enable wizrd delivery pipeline",
      "--body", `Enables the Digitaliko wizrd delivery pipeline (triage → plan → implement → review-loop → verify → doc-gardening). Filter: ${filterKind}${filterValue ? `=${filterValue}` : ""}. Docs root: ${ctx.docsRoot}.`,
    ], opts.cwd);
    log("✓", `Opened PR: ${url.trim()}`);
  }

  console.log("");
  console.log("Next: review the PR, merge, then assign any issue to test the pipeline.");
}

function seedLabelsScript(): string {
  return join(import.meta.dir, "..", "..", "..", "..", "..", "seed-labels.sh");
}

function log(symbol: string, msg: string): void {
  console.log(`${symbol} ${msg}`);
}

function runCmd(bin: string, args: string[], cwd?: string): void {
  execFileSync(bin, args, { stdio: "inherit", cwd });
}

function runCmdCapture(bin: string, args: string[], cwd?: string): string {
  return execFileSync(bin, args, { encoding: "utf-8", cwd });
}

async function promptFilterKind(): Promise<FilterKind> {
  console.log("? Pickup filter (who/what triggers the pipeline):");
  console.log("    1) assignee=Fr33dom91   (Peter — recommended)");
  console.log("    2) label=auto            (opt-in per issue)");
  console.log("    3) none                  (every new issue)");
  const ans = (await readLine("  [1-3, default 1]: ")).trim() || "1";
  if (ans === "2") return "label";
  if (ans === "3") return "none";
  return "assignee";
}

async function promptFilterValue(kind: FilterKind): Promise<string> {
  if (kind === "assignee") {
    return (await readLine("  Assignee login [Fr33dom91]: ")).trim() || "Fr33dom91";
  }
  if (kind === "label") {
    return (await readLine("  Label name [auto]: ")).trim() || "auto";
  }
  return "";
}

async function promptYesNo(question: string, defaultYes: boolean): Promise<boolean> {
  const suffix = defaultYes ? "[Y/n]" : "[y/N]";
  const ans = (await readLine(`  ${question} ${suffix}: `)).trim().toLowerCase();
  if (!ans) return defaultYes;
  return ans.startsWith("y");
}

function readLine(prompt: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (a) => {
      rl.close();
      resolve(a);
    });
  });
}
