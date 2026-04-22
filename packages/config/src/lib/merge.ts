/**
 * Merge strategies for config generation.
 *
 * Permissions: Union of allow[] and ask[] arrays. If a local override moves
 *              an item from ask to allow, it gets removed from ask.
 * MCP:         Deep merge of mcpServers objects. Local wins on key conflicts.
 * Hooks:       Base hooks always included. Local hooks appended per hook name.
 */

import { existsSync } from "fs";
import { join } from "path";
import type { SettingsTemplate, McpTemplate, HooksTemplate } from "./templates.ts";

// --- Types for local overrides ---

interface LocalSettingsOverride {
  permissions?: {
    allow?: string[];
    ask?: string[];
  };
  hooks?: Record<string, unknown[]>;
}

interface LocalMcpOverride {
  mcpServers?: Record<string, unknown>;
}

// --- File loading helpers ---

async function loadLocalJson<T>(path: string): Promise<T | null> {
  if (!existsSync(path)) return null;
  const file = Bun.file(path);
  return file.json() as Promise<T>;
}

// --- Permission merging ---

/**
 * Deduplicate an array preserving order.
 */
function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

/**
 * Merge permissions: union of allow[], union of ask[].
 * If local moves items to allow, remove them from ask.
 */
function mergePermissions(
  base: { allow: string[]; ask: string[] },
  local: { allow?: string[]; ask?: string[] } | undefined
): { allow: string[]; ask: string[] } {
  const localAllow = local?.allow ?? [];
  const localAsk = local?.ask ?? [];

  const mergedAllow = unique([...base.allow, ...localAllow]);

  // Items in merged allow should not appear in ask
  const allowSet = new Set(mergedAllow);
  const mergedAsk = unique([...base.ask, ...localAsk]).filter(
    (item) => !allowSet.has(item)
  );

  return { allow: mergedAllow, ask: mergedAsk };
}

// --- Hook merging ---

/**
 * Merge hooks: base hooks always present, local hooks appended.
 * Superset notification hooks are merged in from hooks-base template.
 */
function mergeHooks(
  settingsHooks: Record<string, unknown[]>,
  supersetHooks: HooksTemplate,
  localHooks: Record<string, unknown[]> | undefined
): Record<string, unknown[]> {
  const merged: Record<string, unknown[]> = {};

  // Start with settings template hooks (e.g., SessionStart for L0/L1)
  for (const [name, entries] of Object.entries(settingsHooks)) {
    merged[name] = [...entries];
  }

  // Merge in Superset notification hooks
  for (const [name, entries] of Object.entries(supersetHooks)) {
    if (!merged[name]) {
      merged[name] = [];
    }
    merged[name].push(...entries);
  }

  // Append local hooks
  if (localHooks) {
    for (const [name, entries] of Object.entries(localHooks)) {
      if (!merged[name]) {
        merged[name] = [];
      }
      merged[name].push(...entries);
    }
  }

  return merged;
}

// --- MCP merging ---

/**
 * Deep merge MCP servers. Local wins on key conflict.
 */
function mergeMcpServers(
  base: Record<string, unknown>,
  local: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!local) return { ...base };
  return { ...base, ...local };
}

// --- Public API ---

export interface MergedConfig {
  settings: {
    permissions: { allow: string[]; ask: string[] };
    hooks: Record<string, unknown[]>;
  };
  mcp: {
    mcpServers: Record<string, unknown>;
  };
}

/**
 * Merge base templates + local overrides into final config.
 */
export async function mergeConfig(
  baseSettings: SettingsTemplate,
  baseMcp: McpTemplate,
  baseHooks: HooksTemplate,
  repoDir: string
): Promise<MergedConfig> {
  // Load local overrides
  const localSettings = await loadLocalJson<LocalSettingsOverride>(
    join(repoDir, ".claude", "settings.local.json")
  );
  const localMcp = await loadLocalJson<LocalMcpOverride>(
    join(repoDir, ".mcp.local.json")
  );

  // Merge permissions
  const permissions = mergePermissions(
    baseSettings.permissions,
    localSettings?.permissions
  );

  // Merge hooks
  const hooks = mergeHooks(
    baseSettings.hooks,
    baseHooks,
    localSettings?.hooks
  );

  // Merge MCP
  const mcpServers = mergeMcpServers(
    baseMcp.mcpServers,
    localMcp?.mcpServers
  );

  return {
    settings: { permissions, hooks },
    mcp: { mcpServers },
  };
}
