/**
 * wizrd-superset sync
 *
 * Recursively resets all submodules (L1 + L2) to their default remote branch
 * and pulls latest. Handles detached HEADs, diverged branches, and dirty .env files.
 *
 * Flow per submodule:
 *   1. Detect default branch (origin HEAD)
 *   2. Fetch origin
 *   3. Checkout default branch (stash if needed)
 *   4. Fast-forward pull (reset if diverged)
 *   5. Recurse into nested submodules
 */

import { detectLevel, hasSubmodules } from "@wizrd-cli/shared";
import { existsSync } from "fs";
import { join, relative } from "path";

interface SyncResult {
  path: string;
  branch: string;
  status: "ok" | "updated" | "reset" | "failed";
  detail?: string;
}

/**
 * Get the default branch name from origin.
 */
function getDefaultBranch(dir: string): string {
  const result = Bun.spawnSync(["git", "remote", "show", "origin"], {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });
  const match = result.stdout.toString().match(/HEAD branch:\s*(\S+)/);
  return match?.[1] || "main";
}

/**
 * Get the current branch name, or empty string if detached.
 */
function getCurrentBranch(dir: string): string {
  const result = Bun.spawnSync(["git", "branch", "--show-current"], {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });
  return result.stdout.toString().trim();
}

/**
 * Check if there are uncommitted changes (excluding untracked files).
 */
function hasUncommittedChanges(dir: string): boolean {
  const result = Bun.spawnSync(["git", "diff", "--quiet", "HEAD"], {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });
  return result.exitCode !== 0;
}

/**
 * Sync a single submodule directory to its default branch.
 */
function syncOne(dir: string, rootDir: string): SyncResult {
  const relPath = relative(rootDir, dir) || ".";

  // 1. Fetch
  const fetch = Bun.spawnSync(["git", "fetch", "--all", "--quiet"], {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (fetch.exitCode !== 0) {
    return { path: relPath, branch: "?", status: "failed", detail: "fetch failed" };
  }

  // 2. Detect default branch
  const defaultBranch = getDefaultBranch(dir);
  const currentBranch = getCurrentBranch(dir);

  // 3. Checkout default branch if not on it
  if (currentBranch !== defaultBranch) {
    // Stash if dirty (common for .env files from port offsets)
    const dirty = hasUncommittedChanges(dir);
    if (dirty) {
      Bun.spawnSync(["git", "stash", "--quiet"], { cwd: dir, stdout: "pipe", stderr: "pipe" });
    }

    const checkout = Bun.spawnSync(["git", "checkout", defaultBranch], {
      cwd: dir,
      stdout: "pipe",
      stderr: "pipe",
    });

    if (checkout.exitCode !== 0) {
      // Branch might not exist locally yet
      const checkoutTrack = Bun.spawnSync(
        ["git", "checkout", "-b", defaultBranch, `origin/${defaultBranch}`],
        { cwd: dir, stdout: "pipe", stderr: "pipe" }
      );
      if (checkoutTrack.exitCode !== 0) {
        if (dirty) Bun.spawnSync(["git", "stash", "pop", "--quiet"], { cwd: dir, stdout: "pipe", stderr: "pipe" });
        return { path: relPath, branch: defaultBranch, status: "failed", detail: "checkout failed" };
      }
    }

    if (dirty) {
      Bun.spawnSync(["git", "stash", "pop", "--quiet"], { cwd: dir, stdout: "pipe", stderr: "pipe" });
    }
  }

  // 4. Pull — try fast-forward first, reset if diverged
  const pull = Bun.spawnSync(["git", "pull", "--ff-only", "--quiet"], {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });

  if (pull.exitCode !== 0) {
    // Diverged — reset to origin
    const reset = Bun.spawnSync(["git", "reset", "--hard", `origin/${defaultBranch}`], {
      cwd: dir,
      stdout: "pipe",
      stderr: "pipe",
    });
    if (reset.exitCode !== 0) {
      return { path: relPath, branch: defaultBranch, status: "failed", detail: "reset failed" };
    }
    return { path: relPath, branch: defaultBranch, status: "reset", detail: `diverged → reset to origin/${defaultBranch}` };
  }

  // Determine if anything changed
  const wasDetached = currentBranch === "";
  const wasDifferentBranch = currentBranch !== defaultBranch;

  if (wasDetached || wasDifferentBranch) {
    return { path: relPath, branch: defaultBranch, status: "updated", detail: currentBranch ? `was on ${currentBranch}` : "was detached" };
  }

  return { path: relPath, branch: defaultBranch, status: "ok" };
}

/**
 * Parse submodule paths from .gitmodules.
 */
function parseSubmodulePaths(dir: string): string[] {
  const gitmodules = join(dir, ".gitmodules");
  if (!existsSync(gitmodules)) return [];

  const result = Bun.spawnSync(
    ["git", "config", "--file", ".gitmodules", "--get-regexp", "^submodule\\..*\\.path$"],
    { cwd: dir, stdout: "pipe", stderr: "pipe" }
  );

  return result.stdout
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split(/\s+/)[1])
    .filter(Boolean);
}

/**
 * Recursively sync all submodules.
 */
function syncAll(dir: string, rootDir: string): SyncResult[] {
  const results: SyncResult[] = [];
  const submodules = parseSubmodulePaths(dir);

  for (const sm of submodules) {
    const smDir = join(dir, sm);
    if (!existsSync(join(smDir, ".git"))) {
      // Not initialized — skip (run setup first)
      results.push({
        path: relative(rootDir, smDir),
        branch: "?",
        status: "failed",
        detail: "not initialized — run setup first",
      });
      continue;
    }

    const result = syncOne(smDir, rootDir);
    results.push(result);

    // Recurse into nested submodules (L2 inside L1)
    const nested = syncAll(smDir, rootDir);
    results.push(...nested);
  }

  return results;
}

export async function sync(): Promise<void> {
  const dir = process.cwd();
  const info = await detectLevel(dir);

  console.log(`=== wizrd-superset sync ===`);
  console.log(`  Level: ${info.level} (${info.label})`);
  console.log("");

  const results = syncAll(dir, dir);

  if (results.length === 0) {
    console.log("  No submodules found.");
    return;
  }

  // Summary
  const ok = results.filter((r) => r.status === "ok");
  const updated = results.filter((r) => r.status === "updated");
  const reset = results.filter((r) => r.status === "reset");
  const failed = results.filter((r) => r.status === "failed");

  // Print results grouped by status
  if (updated.length > 0 || reset.length > 0) {
    for (const r of [...updated, ...reset]) {
      const icon = r.status === "reset" ? "↻" : "→";
      console.log(`  ${icon} ${r.path} → ${r.branch} (${r.detail})`);
    }
    console.log("");
  }

  if (failed.length > 0) {
    for (const r of failed) {
      console.log(`  ✗ ${r.path} — ${r.detail}`);
    }
    console.log("");
  }

  console.log(`  ${ok.length} up to date, ${updated.length} updated, ${reset.length} reset, ${failed.length} failed`);
  console.log(`  Total: ${results.length} submodules synced`);
}
