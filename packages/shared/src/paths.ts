/**
 * Path resolution for wizrd repos.
 */

import { existsSync, readdirSync } from "fs";
import { join, resolve } from "path";

/**
 * Find the L0 root by walking up from cwd looking for CLAUDE.md with L0 level.
 */
export async function findL0Root(startDir: string = process.cwd()): Promise<string | null> {
  let dir = resolve(startDir);
  while (dir !== "/") {
    const claudeMd = join(dir, "CLAUDE.md");
    if (existsSync(claudeMd)) {
      const content = await Bun.file(claudeMd).text();
      if (content.match(/##\s*Wizrd Level:\s*L0/i)) {
        return dir;
      }
    }
    dir = join(dir, "..");
  }
  return null;
}

/**
 * List all client directories under clients/ at L0 root.
 */
export function listClients(l0Root: string): string[] {
  const clientsDir = join(l0Root, "clients");
  if (!existsSync(clientsDir)) return [];
  return readdirSync(clientsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();
}

/**
 * Resolve path to a client's L1 wizrd.
 */
export function clientPath(l0Root: string, clientName: string): string | null {
  const wizrdPath = join(l0Root, "clients", clientName, "wizrd");
  if (existsSync(wizrdPath)) return wizrdPath;
  const directPath = join(l0Root, "clients", clientName);
  if (existsSync(directPath)) return directPath;
  return null;
}

/**
 * List services for a client's L1 wizrd.
 */
export function listServices(l1Path: string): string[] {
  const servicesDir = join(l1Path, "services");
  if (!existsSync(servicesDir)) return [];
  return readdirSync(servicesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();
}
