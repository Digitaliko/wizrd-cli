/**
 * Dependency installation — detects package manager and installs.
 */

import { existsSync } from "fs";
import { join, basename } from "path";
import { Glob } from "bun";
import { detectPackageManager, type PackageManager } from "@wizrd-cli/shared";

const INSTALL_COMMANDS: Record<Exclude<PackageManager, null>, string[]> = {
  bun: ["bun", "install"],
  pnpm: ["pnpm", "install"],
  npm: ["npm", "install"],
  yarn: ["yarn", "install"],
  composer: ["composer", "install"],
};

/**
 * Install dependencies in a single directory
 */
export async function installDeps(dir: string): Promise<boolean> {
  const pm = detectPackageManager(dir);
  if (!pm) return false;

  const cmd = INSTALL_COMMANDS[pm];
  const name = basename(dir);

  console.log(`  [${name}] installing with ${pm}...`);
  const proc = Bun.spawn(cmd, {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;

  if (exitCode === 0) {
    console.log(`  [${name}] deps installed`);
    return true;
  } else {
    const stderr = await new Response(proc.stderr).text();
    console.log(`  [${name}] install failed: ${stderr.slice(0, 200)}`);
    return false;
  }
}

/**
 * Find and install deps in all service directories (L1 → L2 services)
 */
export async function installAllServiceDeps(dir: string): Promise<number> {
  const servicesDir = join(dir, "services");
  if (!existsSync(servicesDir)) return 0;

  let installed = 0;
  const glob = new Glob("*/");

  for await (const serviceDir of glob.scan({ cwd: servicesDir, onlyFiles: false })) {
    const fullPath = join(servicesDir, serviceDir);
    if (detectPackageManager(fullPath)) {
      const ok = await installDeps(fullPath);
      if (ok) installed++;
    }
  }

  return installed;
}
