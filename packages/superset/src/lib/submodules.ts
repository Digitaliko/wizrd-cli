/**
 * Resilient git submodule initialization.
 * Handles stale refs (force-pushed commits) by falling back to origin/HEAD.
 * Uses object-store alternates to avoid re-cloning from remote in worktrees.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "fs";
import { join, resolve, dirname } from "path";

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
 * Resolve the actual git directory for a repo (follows .git files in worktrees).
 */
function resolveGitDir(dir: string): string | null {
  const gitPath = join(dir, ".git");
  if (!existsSync(gitPath)) return null;

  try {
    const stat = Bun.spawnSync(["test", "-d", gitPath]);
    if (stat.exitCode === 0) {
      // .git is a directory — regular repo
      return gitPath;
    }
  } catch {}

  // .git is a file — worktree, read the gitdir pointer
  try {
    const content = readFileSync(gitPath, "utf-8").trim();
    const match = content.match(/^gitdir:\s*(.+)$/);
    if (match) {
      const gitdir = match[1];
      // Resolve relative paths
      return resolve(dir, gitdir);
    }
  } catch {}

  return null;
}

/**
 * Find the main modules directory for this repo.
 * In a worktree, the main modules are at the commondir level.
 */
function findMainModulesDir(dir: string): string | null {
  const gitDir = resolveGitDir(dir);
  if (!gitDir) return null;

  // Check for commondir (worktree indicator)
  const commondirPath = join(gitDir, "commondir");
  if (existsSync(commondirPath)) {
    const commondir = readFileSync(commondirPath, "utf-8").trim();
    const resolvedCommon = resolve(gitDir, commondir);
    const modulesDir = join(resolvedCommon, "modules");
    if (existsSync(modulesDir)) return modulesDir;
  }

  // Regular repo — modules are in .git/modules
  const modulesDir = join(gitDir, "modules");
  if (existsSync(modulesDir)) return modulesDir;

  return null;
}

/**
 * Pre-create submodule module directories with alternates pointing to existing
 * object stores. This lets `git submodule update --init` skip the clone step
 * and just checkout — going from ~20s to <1s per submodule.
 */
function setupAlternates(dir: string, submodules: string[]): number {
  const gitDir = resolveGitDir(dir);
  if (!gitDir) return 0;

  const mainModulesDir = findMainModulesDir(dir);
  if (!mainModulesDir) return 0;

  let count = 0;

  for (const sm of submodules) {
    // Main module objects (shared across all worktrees)
    const mainModuleDir = join(mainModulesDir, sm);
    const mainObjectsDir = join(mainModuleDir, "objects");
    if (!existsSync(mainObjectsDir)) continue;

    // Per-worktree module directory
    const worktreeModuleDir = join(gitDir, "modules", sm);
    if (existsSync(join(worktreeModuleDir, "objects"))) continue; // Already set up

    // Create minimal git repo structure with alternates
    const objectsDir = join(worktreeModuleDir, "objects", "info");
    mkdirSync(objectsDir, { recursive: true });
    mkdirSync(join(worktreeModuleDir, "refs", "heads"), { recursive: true });
    mkdirSync(join(worktreeModuleDir, "refs", "tags"), { recursive: true });

    // Point to main module's object store
    writeFileSync(join(objectsDir, "alternates"), mainObjectsDir + "\n");

    // Copy essential files from main module
    for (const file of ["config", "HEAD", "packed-refs"]) {
      const src = join(mainModuleDir, file);
      if (existsSync(src)) {
        copyFileSync(src, join(worktreeModuleDir, file));
      }
    }

    count++;
  }

  return count;
}

/**
 * Init submodules one-by-one with resilient error recovery.
 * If a submodule points to a missing commit, checks out origin's default branch.
 * Pre-populates object stores via alternates for instant init in worktrees.
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

  // Pre-populate object stores from existing modules (worktree optimization)
  const cached = setupAlternates(dir, submodules);
  if (cached > 0) {
    console.log(`  Cached ${cached} submodule(s) from local objects`);
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
