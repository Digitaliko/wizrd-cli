/**
 * wizrd-superset teardown
 *
 * Kill running processes, stop Docker, release port allocation.
 */

import { existsSync, readdirSync, unlinkSync } from "fs";
import { join, basename } from "path";
import { detectLevel, hasDocker } from "@wizrd-cli/shared";
import { dockerDown, dockerDownAll } from "../lib/docker.ts";
import { release } from "../lib/port-registry.ts";

const PIDS_DIR = ".superset/.pids";

/**
 * Kill all tracked processes
 */
async function killTrackedProcesses(dir: string): Promise<number> {
  const pidsDir = join(dir, PIDS_DIR);
  if (!existsSync(pidsDir)) return 0;

  const files = readdirSync(pidsDir);
  let killed = 0;

  for (const file of files) {
    const pidFile = join(pidsDir, file);
    const pid = parseInt(await Bun.file(pidFile).text(), 10);

    if (isNaN(pid)) {
      unlinkSync(pidFile);
      continue;
    }

    try {
      process.kill(pid, "SIGTERM");
      console.log(`  Killed ${file} (PID ${pid})`);
      killed++;
    } catch {
      // Process already dead
    }
    unlinkSync(pidFile);
  }

  return killed;
}

export async function teardown(): Promise<void> {
  const dir = process.cwd();
  const info = await detectLevel(dir);
  const workspaceName = process.env.SUPERSET_WORKSPACE_NAME || basename(dir);

  console.log(`=== wizrd-superset teardown ===`);
  console.log(`  Level: ${info.level} (${info.label})`);
  console.log(`  Workspace: ${workspaceName}`);
  console.log("");

  // 1. Kill tracked processes
  console.log("Stopping processes...");
  const killed = await killTrackedProcesses(dir);
  console.log(`  Stopped ${killed} process(es)`);

  // 2. Stop Docker
  if (info.level === "L2") {
    if (hasDocker(dir)) {
      await dockerDown(dir);
    }
  } else if (info.level === "L1") {
    const count = await dockerDownAll(dir);
    if (count > 0) console.log(`  Stopped Docker in ${count} services`);
  }

  // 3. Release port allocation
  const released = await release(workspaceName);
  if (released) {
    console.log(`  Released port allocation for '${workspaceName}'`);
  }

  // 4. Clean .env.superset
  const envSupersetPath = join(dir, ".env.superset");
  if (existsSync(envSupersetPath)) {
    unlinkSync(envSupersetPath);
    console.log("  Removed .env.superset");
  }

  console.log("");
  console.log("=== Teardown complete ===");
}
