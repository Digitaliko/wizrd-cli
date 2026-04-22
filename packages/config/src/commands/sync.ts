/**
 * wizrd-config sync — Generate .claude/settings.json + .mcp.json from level + local overrides.
 */

import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { detectLevel } from "@wizrd-cli/superset/lib/detect-level.ts";
import { loadSettingsTemplate, loadMcpTemplate, loadHooksTemplate } from "../lib/templates.ts";
import { mergeConfig } from "../lib/merge.ts";

export async function sync(): Promise<void> {
  const cwd = process.cwd();
  const levelInfo = await detectLevel(cwd);

  console.log(`Detected level: ${levelInfo.level} (${levelInfo.label})`);

  if (levelInfo.level === "unknown") {
    console.error("Cannot generate config: no wizrd level detected.");
    console.error("Ensure CLAUDE.md has a '## Wizrd Level: L0/L1/L2 (Label)' line.");
    process.exit(1);
  }

  const [baseSettings, baseMcp, baseHooks] = await Promise.all([
    loadSettingsTemplate(levelInfo.level),
    loadMcpTemplate(),
    loadHooksTemplate(),
  ]);

  const merged = await mergeConfig(baseSettings, baseMcp, baseHooks, cwd);

  // Ensure .claude/ directory exists
  const claudeDir = join(cwd, ".claude");
  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  // Write settings.json
  const settingsPath = join(claudeDir, "settings.json");
  const settingsContent = JSON.stringify(merged.settings, null, 2) + "\n";
  await Bun.write(settingsPath, settingsContent);
  console.log(`  Wrote ${settingsPath}`);

  // Write .mcp.json
  const mcpPath = join(cwd, ".mcp.json");
  const mcpContent = JSON.stringify(merged.mcp, null, 2) + "\n";
  await Bun.write(mcpPath, mcpContent);
  console.log(`  Wrote ${mcpPath}`);

  console.log("\nConfig synced successfully.");
}
