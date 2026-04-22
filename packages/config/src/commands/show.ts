/**
 * wizrd-config show — Dry run: show what configs would be generated.
 */

import { detectLevel } from "@wizrd-cli/superset/lib/detect-level.ts";
import { loadSettingsTemplate, loadMcpTemplate, loadHooksTemplate } from "../lib/templates.ts";
import { mergeConfig } from "../lib/merge.ts";

export async function show(): Promise<void> {
  const cwd = process.cwd();
  const levelInfo = await detectLevel(cwd);

  console.log(`Detected level: ${levelInfo.level} (${levelInfo.label})`);
  console.log(`Directory: ${levelInfo.dir}\n`);

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

  console.log("=== .claude/settings.json ===");
  console.log(JSON.stringify(merged.settings, null, 2));
  console.log("\n=== .mcp.json ===");
  console.log(JSON.stringify(merged.mcp, null, 2));
}
