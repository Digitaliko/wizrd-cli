/**
 * wizrd-config doctor — Check for stale or conflicting config.
 *
 * Checks:
 * 1. CLAUDE.md exists and has a valid level
 * 2. .claude/settings.json exists
 * 3. .mcp.json exists
 * 4. Generated config matches what's on disk (not stale)
 * 5. No conflicting entries (item in both allow and ask)
 */

import { existsSync } from "fs";
import { join } from "path";
import { detectLevel } from "@wizrd-cli/shared";
import { loadSettingsTemplate, loadMcpTemplate, loadHooksTemplate } from "../lib/templates.ts";
import { mergeConfig } from "../lib/merge.ts";

interface Check {
  name: string;
  status: "ok" | "warn" | "fail";
  message: string;
}

export async function doctor(): Promise<void> {
  const cwd = process.cwd();
  const checks: Check[] = [];

  // 1. Level detection
  const levelInfo = await detectLevel(cwd);
  if (levelInfo.level === "unknown") {
    checks.push({
      name: "Wizrd Level",
      status: "fail",
      message: "No wizrd level detected in CLAUDE.md. Add '## Wizrd Level: L0/L1/L2 (Label)' line.",
    });
  } else {
    checks.push({
      name: "Wizrd Level",
      status: "ok",
      message: `${levelInfo.level} (${levelInfo.label})`,
    });
  }

  // 2. settings.json exists
  const settingsPath = join(cwd, ".claude", "settings.json");
  if (!existsSync(settingsPath)) {
    checks.push({
      name: "settings.json",
      status: "fail",
      message: "Missing .claude/settings.json. Run 'wizrd-config sync' to generate.",
    });
  } else {
    checks.push({
      name: "settings.json",
      status: "ok",
      message: "Exists",
    });
  }

  // 3. .mcp.json exists
  const mcpPath = join(cwd, ".mcp.json");
  if (!existsSync(mcpPath)) {
    checks.push({
      name: ".mcp.json",
      status: "warn",
      message: "Missing .mcp.json. Run 'wizrd-config sync' to generate.",
    });
  } else {
    checks.push({
      name: ".mcp.json",
      status: "ok",
      message: "Exists",
    });
  }

  // 4. Staleness check — compare generated vs on-disk
  if (levelInfo.level !== "unknown" && existsSync(settingsPath)) {
    try {
      const [baseSettings, baseMcp, baseHooks] = await Promise.all([
        loadSettingsTemplate(levelInfo.level),
        loadMcpTemplate(),
        loadHooksTemplate(),
      ]);
      const merged = await mergeConfig(baseSettings, baseMcp, baseHooks, cwd);

      const currentSettings = await Bun.file(settingsPath).json();
      const expectedSettings = JSON.stringify(merged.settings, null, 2);
      const actualSettings = JSON.stringify(currentSettings, null, 2);

      if (expectedSettings === actualSettings) {
        checks.push({
          name: "Settings freshness",
          status: "ok",
          message: "settings.json matches expected output",
        });
      } else {
        checks.push({
          name: "Settings freshness",
          status: "warn",
          message: "settings.json is stale or manually edited. Run 'wizrd-config sync' to update.",
        });
      }

      // Check MCP staleness too
      if (existsSync(mcpPath)) {
        const currentMcp = await Bun.file(mcpPath).json();
        const expectedMcp = JSON.stringify(merged.mcp, null, 2);
        const actualMcp = JSON.stringify(currentMcp, null, 2);

        if (expectedMcp === actualMcp) {
          checks.push({
            name: "MCP freshness",
            status: "ok",
            message: ".mcp.json matches expected output",
          });
        } else {
          checks.push({
            name: "MCP freshness",
            status: "warn",
            message: ".mcp.json is stale or manually edited. Run 'wizrd-config sync' to update.",
          });
        }
      }
    } catch (err) {
      checks.push({
        name: "Config comparison",
        status: "warn",
        message: `Could not compare configs: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // 5. Conflict check — items in both allow and ask
  if (existsSync(settingsPath)) {
    try {
      const settings = await Bun.file(settingsPath).json();
      const allow = new Set(settings.permissions?.allow ?? []);
      const ask = settings.permissions?.ask ?? [];
      const conflicts = ask.filter((item: string) => allow.has(item));

      if (conflicts.length > 0) {
        checks.push({
          name: "Permission conflicts",
          status: "warn",
          message: `Items in both allow and ask: ${conflicts.join(", ")}`,
        });
      } else {
        checks.push({
          name: "Permission conflicts",
          status: "ok",
          message: "No conflicts",
        });
      }
    } catch {
      checks.push({
        name: "Permission conflicts",
        status: "warn",
        message: "Could not parse settings.json",
      });
    }
  }

  // 6. Local override files
  const localSettingsPath = join(cwd, ".claude", "settings.local.json");
  const localMcpPath = join(cwd, ".mcp.local.json");
  if (existsSync(localSettingsPath)) {
    checks.push({
      name: "Local settings override",
      status: "ok",
      message: ".claude/settings.local.json found",
    });
  }
  if (existsSync(localMcpPath)) {
    checks.push({
      name: "Local MCP override",
      status: "ok",
      message: ".mcp.local.json found",
    });
  }

  // Print results
  console.log("wizrd-config doctor\n");
  let hasFailures = false;
  for (const check of checks) {
    const icon = check.status === "ok" ? "[OK]" : check.status === "warn" ? "[!!]" : "[FAIL]";
    console.log(`  ${icon} ${check.name}: ${check.message}`);
    if (check.status === "fail") hasFailures = true;
  }

  console.log("");
  if (hasFailures) {
    console.log("Some checks failed. Fix the issues above and re-run.");
    process.exit(1);
  } else {
    console.log("All checks passed.");
  }
}
