/**
 * Resilient git submodule initialization.
 * Handles stale refs (force-pushed commits) by falling back to origin/HEAD.
 */

import { existsSync } from "fs";
import { join } from "path";

interface SubmoduleResult {
  path: string;
  status: "ok" | "recovered" | "failed";
}

/**
 * Parse submodule paths from .gitmodules
 */
async function parseSubmodulePaths(dir: string): Promise<string[]> {
  const gitmodules = join(dir, ".gitmodules");
  if (!existsSync(gitmodules)) return [];

  const proc = Bun.spawn(
    ["git", "config", "--file", ".gitmodules", "--get-regexp", "^submodule\\..*\\.path$"],
    { cwd: dir, stdout: "pipe", stderr: "pipe" }
  );
  const output = await new Response(proc.stdout).text();
  await proc.exited;

  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split(/\s+/)[1])
    .filter(Boolean);
}

/**
 * Init submodules one-by-one with resilient error recovery.
 * If a submodule points to a missing commit, checks out origin's default branch.
 */
export async function initSubmodules(
  dir: string,
  options: { recursive?: boolean; jobs?: number } = {}
): Promise<SubmoduleResult[]> {
  const { recursive = true, jobs = 4 } = options;
  const submodules = await parseSubmodulePaths(dir);

  if (submodules.length === 0) {
    console.log("  No submodules found.");
    return [];
  }

  // Init all submodule configs first
  Bun.spawnSync(["git", "submodule", "init"], { cwd: dir, stdout: "ignore", stderr: "ignore" });

  const results: SubmoduleResult[] = [];

  for (const sm of submodules) {
    process.stdout.write(`  [${sm}] updating...`);

    const args = ["git", "submodule", "update", "--init"];
    if (recursive) args.push("--recursive");
    args.push("--jobs", String(jobs), "--", sm);

    const update = Bun.spawnSync(args, { cwd: dir, stdout: "pipe", stderr: "pipe" });

    if (update.exitCode === 0) {
      console.log(" OK");
      results.push({ path: sm, status: "ok" });
      continue;
    }

    // Recovery: checkout origin's default branch
    console.log(" recorded commit missing, recovering...");

    const smDir = join(dir, sm);
    if (!existsSync(smDir)) {
      console.log(`  [${sm}] FAILED - directory missing`);
      results.push({ path: sm, status: "failed" });
      continue;
    }

    const fetchResult = Bun.spawnSync(["git", "fetch", "origin"], {
      cwd: smDir,
      stdout: "pipe",
      stderr: "pipe",
    });

    if (fetchResult.exitCode !== 0) {
      console.log(`  [${sm}] FAILED - could not fetch`);
      results.push({ path: sm, status: "failed" });
      continue;
    }

    // Detect default branch
    const showOrigin = Bun.spawnSync(["git", "remote", "show", "origin"], {
      cwd: smDir,
      stdout: "pipe",
      stderr: "pipe",
    });
    const showOutput = showOrigin.stdout.toString();
    const branchMatch = showOutput.match(/HEAD branch:\s*(\S+)/);
    const defaultBranch = branchMatch?.[1] || "main";

    const checkout = Bun.spawnSync(["git", "checkout", `origin/${defaultBranch}`], {
      cwd: smDir,
      stdout: "pipe",
      stderr: "pipe",
    });

    if (checkout.exitCode === 0) {
      console.log(`  [${sm}] recovered -> origin/${defaultBranch}`);
      results.push({ path: sm, status: "recovered" });
    } else {
      console.log(`  [${sm}] FAILED - could not recover`);
      results.push({ path: sm, status: "failed" });
    }
  }

  return results;
}
