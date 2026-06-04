/**
 * Global port registry — allocates and tracks port offsets across Superset workspaces.
 * State file: ~/.wizrd-cli/state/port-registry.json
 */

import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

const STATE_DIR = join(homedir(), ".wizrd-cli", "state");
const REGISTRY_PATH = join(STATE_DIR, "port-registry.json");
const PORT_OFFSET_STEP = 100;

export interface PortAllocation {
  project: string;
  workspace: string;
  offset: number;
  ports: Record<string, number>;
  workspacePath: string;
  createdAt: string;
}

export interface PortRegistry {
  allocations: Record<string, PortAllocation>;
}

function ensureStateDir(): void {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
}

export async function loadRegistry(): Promise<PortRegistry> {
  ensureStateDir();
  if (!existsSync(REGISTRY_PATH)) {
    return { allocations: {} };
  }
  const content = await Bun.file(REGISTRY_PATH).text();
  return JSON.parse(content) as PortRegistry;
}

export async function saveRegistry(registry: PortRegistry): Promise<void> {
  ensureStateDir();
  await Bun.write(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n");
}

/**
 * Clean stale allocations (workspace directory no longer exists)
 */
export async function cleanStale(registry: PortRegistry): Promise<number> {
  let cleaned = 0;
  for (const [key, alloc] of Object.entries(registry.allocations)) {
    if (!existsSync(alloc.workspacePath)) {
      delete registry.allocations[key];
      cleaned++;
    }
  }
  if (cleaned > 0) {
    await saveRegistry(registry);
  }
  return cleaned;
}

/**
 * Find next available port offset
 */
function nextAvailableOffset(registry: PortRegistry): number {
  const usedOffsets = new Set(
    Object.values(registry.allocations).map((a) => a.offset)
  );
  let offset = 0;
  while (usedOffsets.has(offset)) {
    offset += PORT_OFFSET_STEP;
  }
  return offset;
}

export type AllocateMode = "default" | "shift";

export class OffsetTakenError extends Error {
  constructor(public takenBy: PortAllocation) {
    super(
      `Offset +0 (canonical ports) is held by workspace '${takenBy.workspace}' (project: ${takenBy.project}).\n` +
        `Either tear down that workspace, or re-run setup with --shift to auto-allocate the next free offset.`
    );
    this.name = "OffsetTakenError";
  }
}

/**
 * Allocate a port offset for a workspace.
 * Returns the allocation (existing if already allocated).
 *
 * Modes:
 *   - "default": use offset 0 (canonical ports). Throws OffsetTakenError if held by another live workspace.
 *   - "shift":   auto-pick the next unused offset (legacy behavior).
 */
export async function allocate(
  workspaceName: string,
  workspacePath: string,
  project: string,
  defaultPorts: Record<string, number>,
  mode: AllocateMode = "default"
): Promise<PortAllocation> {
  const registry = await loadRegistry();

  // Clean stale first
  await cleanStale(registry);

  // Check if already allocated
  if (registry.allocations[workspaceName]) {
    return registry.allocations[workspaceName];
  }

  let offset: number;
  if (mode === "default") {
    const holder = Object.values(registry.allocations).find((a) => a.offset === 0);
    if (holder) throw new OffsetTakenError(holder);
    offset = 0;
  } else {
    offset = nextAvailableOffset(registry);
  }

  // Apply offset to default ports
  const ports: Record<string, number> = {};
  for (const [name, defaultPort] of Object.entries(defaultPorts)) {
    ports[name] = defaultPort + offset;
  }

  const allocation: PortAllocation = {
    project,
    workspace: workspaceName,
    offset,
    ports,
    workspacePath,
    createdAt: new Date().toISOString(),
  };

  registry.allocations[workspaceName] = allocation;
  await saveRegistry(registry);

  return allocation;
}

/**
 * Release a workspace's port allocation
 */
export async function release(workspaceName: string): Promise<boolean> {
  const registry = await loadRegistry();
  if (registry.allocations[workspaceName]) {
    delete registry.allocations[workspaceName];
    await saveRegistry(registry);
    return true;
  }
  return false;
}

/**
 * Get all active allocations
 */
export async function listAllocations(): Promise<PortAllocation[]> {
  const registry = await loadRegistry();
  await cleanStale(registry);
  return Object.values(registry.allocations).sort((a, b) => a.offset - b.offset);
}
