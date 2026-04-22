/**
 * Docker Compose lifecycle management
 */

import { existsSync } from "fs";
import { join } from "path";
import { Glob } from "bun";

/**
 * Find docker-compose file in a directory
 */
function findComposeFile(dir: string): string | null {
  const candidates = [
    "docker-compose.yml",
    "docker-compose.yaml",
    "compose.yml",
    "compose.yaml",
  ];
  for (const f of candidates) {
    if (existsSync(join(dir, f))) return f;
  }
  return null;
}

/**
 * Start Docker Compose services in a directory
 */
export async function dockerUp(dir: string): Promise<boolean> {
  const composeFile = findComposeFile(dir);
  if (!composeFile) return false;

  console.log(`  Starting Docker services (${composeFile})...`);
  const proc = Bun.spawn(["docker", "compose", "-f", composeFile, "up", "-d"], {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;

  if (exitCode === 0) {
    console.log("  Docker services started");
    return true;
  } else {
    const stderr = await new Response(proc.stderr).text();
    console.log(`  Docker start failed: ${stderr.slice(0, 200)}`);
    return false;
  }
}

/**
 * Stop Docker Compose services
 */
export async function dockerDown(dir: string): Promise<boolean> {
  const composeFile = findComposeFile(dir);
  if (!composeFile) return false;

  console.log(`  Stopping Docker services...`);
  const proc = Bun.spawn(["docker", "compose", "-f", composeFile, "down"], {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;
  return exitCode === 0;
}

/**
 * Start Docker in all service directories that have compose files
 */
export async function dockerUpAll(dir: string): Promise<number> {
  const servicesDir = join(dir, "services");
  if (!existsSync(servicesDir)) return 0;

  let started = 0;
  const glob = new Glob("*/");
  for await (const serviceDir of glob.scan({ cwd: servicesDir, onlyFiles: false })) {
    const fullPath = join(servicesDir, serviceDir);
    if (findComposeFile(fullPath)) {
      const ok = await dockerUp(fullPath);
      if (ok) started++;
    }
  }
  return started;
}

/**
 * Stop Docker in all service directories
 */
export async function dockerDownAll(dir: string): Promise<number> {
  const servicesDir = join(dir, "services");
  if (!existsSync(servicesDir)) return 0;

  let stopped = 0;
  const glob = new Glob("*/");
  for await (const serviceDir of glob.scan({ cwd: servicesDir, onlyFiles: false })) {
    const fullPath = join(servicesDir, serviceDir);
    if (findComposeFile(fullPath)) {
      const ok = await dockerDown(fullPath);
      if (ok) stopped++;
    }
  }
  return stopped;
}
