/**
 * Load base templates for a given wizrd level.
 * Templates are JSON files co-located in ../templates/.
 */

import { join, dirname } from "path";
import type { WizrdLevel } from "@wizrd-cli/shared";

const TEMPLATES_DIR = join(dirname(new URL(import.meta.url).pathname), "..", "templates");

export interface SettingsTemplate {
  permissions: {
    allow: string[];
    ask: string[];
  };
  hooks: Record<string, unknown[]>;
}

export interface McpTemplate {
  mcpServers: Record<string, unknown>;
}

export interface HooksTemplate {
  [hookName: string]: unknown[];
}

async function loadJson<T>(path: string): Promise<T> {
  const file = Bun.file(path);
  return file.json() as Promise<T>;
}

/**
 * Load the base settings template for a given level.
 */
export async function loadSettingsTemplate(level: WizrdLevel): Promise<SettingsTemplate> {
  const filename = `settings-${level.toLowerCase()}.json`;
  const path = join(TEMPLATES_DIR, filename);
  return loadJson<SettingsTemplate>(path);
}

/**
 * Load the base MCP config template (same for all levels).
 */
export async function loadMcpTemplate(): Promise<McpTemplate> {
  return loadJson<McpTemplate>(join(TEMPLATES_DIR, "mcp-base.json"));
}

/**
 * Load the base hooks template (Superset notification hooks).
 */
export async function loadHooksTemplate(): Promise<HooksTemplate> {
  return loadJson<HooksTemplate>(join(TEMPLATES_DIR, "hooks-base.json"));
}
