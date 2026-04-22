/**
 * Detect wizrd level (L0/L1/L2) by reading CLAUDE.md in the current directory.
 * Looks for `## Wizrd Level:` line.
 */

import { existsSync } from "fs";
import { join } from "path";

export type WizrdLevel = "L0" | "L1" | "L2" | "unknown";

export interface LevelInfo {
  level: WizrdLevel;
  label: string;
  dir: string;
}

export async function detectLevel(dir: string = process.cwd()): Promise<LevelInfo> {
  const claudeMdPath = join(dir, "CLAUDE.md");

  if (!existsSync(claudeMdPath)) {
    return { level: "unknown", label: "No CLAUDE.md found", dir };
  }

  const content = await Bun.file(claudeMdPath).text();

  // Match: ## Wizrd Level: L0 (Company)
  const match = content.match(/##\s*Wizrd Level:\s*(L[012])\s*\(([^)]+)\)/i);

  if (!match) {
    return { level: "unknown", label: "No Wizrd Level found in CLAUDE.md", dir };
  }

  return {
    level: match[1] as WizrdLevel,
    label: match[2],
    dir,
  };
}

/**
 * Check if .gitmodules exists (indicates submodules to init)
 */
export function hasSubmodules(dir: string = process.cwd()): boolean {
  return existsSync(join(dir, ".gitmodules"));
}

/**
 * Check if docker-compose.yml exists
 */
export function hasDocker(dir: string = process.cwd()): boolean {
  return (
    existsSync(join(dir, "docker-compose.yml")) ||
    existsSync(join(dir, "docker-compose.yaml")) ||
    existsSync(join(dir, "compose.yml")) ||
    existsSync(join(dir, "compose.yaml"))
  );
}

/**
 * Detect package manager from lock files
 */
export type PackageManager = "bun" | "pnpm" | "npm" | "yarn" | "composer" | null;

export function detectPackageManager(dir: string = process.cwd()): PackageManager {
  if (existsSync(join(dir, "bun.lock")) || existsSync(join(dir, "bun.lockb"))) return "bun";
  if (existsSync(join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(dir, "yarn.lock"))) return "yarn";
  if (existsSync(join(dir, "composer.lock"))) return "composer";
  if (existsSync(join(dir, "package-lock.json"))) return "npm";
  if (existsSync(join(dir, "package.json"))) return "npm"; // fallback
  return null;
}
