/**
 * wizrd-superset setup
 *
 * Auto-detects wizrd level and runs appropriate setup:
 * - L0: Init all submodules, copy .env, allocate ports
 * - L1: Init L2 submodules, copy .env, allocate ports, install deps per service
 * - L2: Install deps, copy .env, allocate port
 */

import { detectLevel, hasSubmodules } from "../lib/detect-level.ts";
import { initSubmodules } from "../lib/submodules.ts";
import { copyEnvFiles, applyPortOffset, writeEnvSuperset } from "../lib/env.ts";
import { installDeps, installAllServiceDeps } from "../lib/deps.ts";
import { allocate } from "../lib/port-registry.ts";
import { loadPortsConfig, portsToMap } from "../lib/ports-config.ts";
import { basename } from "path";

export async function setup(): Promise<void> {
  const dir = process.cwd();
  const info = await detectLevel(dir);

  const workspaceName = process.env.SUPERSET_WORKSPACE_NAME || basename(dir);
  const rootPath = process.env.SUPERSET_ROOT_PATH;
  const projectName = basename(dir);

  console.log(`=== wizrd-superset setup ===`);
  console.log(`  Level: ${info.level} (${info.label})`);
  console.log(`  Workspace: ${workspaceName}`);
  console.log("");

  // 1. Init submodules (L0 and L1)
  if (hasSubmodules(dir) && (info.level === "L0" || info.level === "L1")) {
    console.log("Initializing submodules...");
    const results = await initSubmodules(dir);
    const failed = results.filter((r) => r.status === "failed");
    if (failed.length > 0) {
      console.log(`\nWarning: ${failed.length} submodule(s) failed:`);
      failed.forEach((r) => console.log(`  - ${r.path}`));
    }
    console.log("");
  }

  // 2. Copy .env files from Superset root (if in a worktree)
  if (rootPath && rootPath !== dir) {
    console.log("Copying .env files from Superset root...");
    const count = await copyEnvFiles(rootPath, dir);
    console.log(`  Copied ${count} .env files`);
    console.log("");
  }

  // 3. Allocate ports
  const portsConfig = await loadPortsConfig(dir);
  const defaultPorts = portsToMap(portsConfig);

  const allocation = await allocate(workspaceName, dir, projectName, defaultPorts);
  console.log(`Port allocation: offset +${allocation.offset}`);
  for (const [name, port] of Object.entries(allocation.ports)) {
    console.log(`  ${name}: ${port}`);
  }
  console.log("");

  // 4. Apply port offsets to .env files
  if (allocation.offset > 0) {
    console.log("Applying port offsets to .env files...");
    const modified = await applyPortOffset(dir, allocation.offset);
    console.log(`  Updated ${modified} files`);
    console.log("");
  }

  // 5. Write .env.superset
  await writeEnvSuperset(dir, allocation.ports, allocation.offset);
  console.log("Wrote .env.superset");

  // 6. Install dependencies
  if (info.level === "L2") {
    console.log("Installing dependencies...");
    await installDeps(dir);
  } else if (info.level === "L1") {
    console.log("Installing dependencies in services...");
    const count = await installAllServiceDeps(dir);
    console.log(`  Installed deps in ${count} services`);
  }
  // L0: skip dep installation (too many services, do manually)

  console.log("");
  console.log("=== Setup complete ===");
}
