/**
 * wizrd-superset run
 *
 * Start dev server(s) with allocated ports.
 * - L0: No-op (or start website)
 * - L1: Start Docker + dev servers in each L2 service
 * - L2: Start Docker + dev server
 */

import { existsSync, mkdirSync } from "fs";
import { join, basename } from "path";
import { detectLevel, detectPackageManager, hasDocker } from "@wizrd-cli/shared";
import { dockerUp, dockerUpAll } from "../lib/docker.ts";
import { loadPortsConfig } from "../lib/ports-config.ts";
import { loadRegistry } from "../lib/port-registry.ts";
import { Glob } from "bun";

const PIDS_DIR = ".superset/.pids";

async function savePid(dir: string, name: string, pid: number): Promise<void> {
  const pidsDir = join(dir, PIDS_DIR);
  if (!existsSync(pidsDir)) mkdirSync(pidsDir, { recursive: true });
  await Bun.write(join(pidsDir, name), String(pid));
}

/**
 * Detect the dev command for a service
 */
function getDevCommand(dir: string): string[] | null {
  const pm = detectPackageManager(dir);
  if (!pm || pm === "composer") return null;

  // Check package.json for dev script
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) return null;

  // Use the package manager's run command
  switch (pm) {
    case "bun":
      return ["bun", "run", "dev"];
    case "pnpm":
      return ["pnpm", "run", "dev"];
    case "npm":
      return ["npm", "run", "dev"];
    case "yarn":
      return ["yarn", "dev"];
    default:
      return null;
  }
}

async function startService(dir: string, name: string, port?: number): Promise<number | null> {
  const cmd = getDevCommand(dir);
  if (!cmd) return null;

  const env: Record<string, string> = { ...process.env as Record<string, string> };
  if (port) env.PORT = String(port);

  // Load .env.superset if it exists
  const envSupersetPath = join(dir, ".env.superset");
  if (existsSync(envSupersetPath)) {
    const content = await Bun.file(envSupersetPath).text();
    for (const line of content.split("\n")) {
      if (line.startsWith("#") || !line.includes("=")) continue;
      const [key, ...rest] = line.split("=");
      env[key] = rest.join("=");
    }
  }

  console.log(`  [${name}] starting: ${cmd.join(" ")}${port ? ` (port ${port})` : ""}`);
  const proc = Bun.spawn(cmd, {
    cwd: dir,
    stdout: "inherit",
    stderr: "inherit",
    env,
  });

  await savePid(process.cwd(), name, proc.pid);
  return proc.pid;
}

export async function run(): Promise<void> {
  const dir = process.cwd();
  const info = await detectLevel(dir);

  console.log(`=== wizrd-superset run ===`);
  console.log(`  Level: ${info.level} (${info.label})`);
  console.log("");

  // Get port allocation for this workspace
  const workspaceName = process.env.SUPERSET_WORKSPACE_NAME || basename(dir);
  const registry = await loadRegistry();
  const allocation = registry.allocations[workspaceName];
  const webPort = allocation?.ports?.web;

  if (info.level === "L2") {
    // Single service: start Docker + dev server
    if (hasDocker(dir)) await dockerUp(dir);
    await startService(dir, basename(dir), webPort);
  } else if (info.level === "L1") {
    // Multi-service: start Docker + dev servers in each L2 service
    const servicesDir = join(dir, "services");
    if (existsSync(servicesDir)) {
      const glob = new Glob("*/");
      for await (const serviceDir of glob.scan({ cwd: servicesDir, onlyFiles: false })) {
        const fullPath = join(servicesDir, serviceDir);
        const serviceName = serviceDir.replace(/\/$/, "");
        if (hasDocker(fullPath)) await dockerUp(fullPath);
        if (detectPackageManager(fullPath)) {
          // Each service in L1 gets its own port (web + service index offset)
          await startService(fullPath, serviceName);
        }
      }
    }
  } else if (info.level === "L0") {
    console.log("L0: No dev servers to start. Use Superset to open L1/L2 workspaces.");
  } else {
    console.log("Unknown level. Starting dev server if possible...");
    if (hasDocker(dir)) await dockerUp(dir);
    await startService(dir, basename(dir), webPort);
  }

  console.log("");
  console.log("=== Run started ===");
}
