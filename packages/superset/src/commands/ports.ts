/**
 * wizrd-superset ports
 *
 * Display global port allocation table across all active workspaces.
 */

import { listAllocations } from "../lib/port-registry.ts";

export async function ports(): Promise<void> {
  const allocations = await listAllocations();

  if (allocations.length === 0) {
    console.log("No active port allocations.");
    console.log("Run 'wizrd-superset setup' in a workspace to allocate ports.");
    return;
  }

  console.log("Active port allocations:\n");

  // Header
  const cols = {
    workspace: Math.max(12, ...allocations.map((a) => a.workspace.length)) + 2,
    project: Math.max(10, ...allocations.map((a) => a.project.length)) + 2,
    offset: 8,
    ports: 30,
  };

  const header = [
    "WORKSPACE".padEnd(cols.workspace),
    "PROJECT".padEnd(cols.project),
    "OFFSET".padEnd(cols.offset),
    "PORTS",
  ].join("  ");

  console.log(header);
  console.log("-".repeat(header.length));

  for (const alloc of allocations) {
    const portsStr = Object.entries(alloc.ports)
      .map(([name, port]) => `${name}:${port}`)
      .join(", ");

    const line = [
      alloc.workspace.padEnd(cols.workspace),
      alloc.project.padEnd(cols.project),
      `+${alloc.offset}`.padEnd(cols.offset),
      portsStr,
    ].join("  ");

    console.log(line);
  }

  console.log(`\n${allocations.length} workspace(s) active.`);
}
