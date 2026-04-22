/**
 * wizrd-superset doctor
 *
 * Validate that the current repo is correctly configured for Superset.
 */

import { existsSync } from "fs";
import { join } from "path";
import { detectLevel, hasSubmodules } from "@wizrd-cli/shared";

interface Check {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

export async function doctor(): Promise<void> {
  const dir = process.cwd();
  const checks: Check[] = [];

  // 1. CLAUDE.md exists
  const claudeMd = join(dir, "CLAUDE.md");
  if (existsSync(claudeMd)) {
    const info = await detectLevel(dir);
    if (info.level !== "unknown") {
      checks.push({ name: "CLAUDE.md", status: "pass", message: `Level: ${info.level} (${info.label})` });
    } else {
      checks.push({ name: "CLAUDE.md", status: "warn", message: "Exists but no Wizrd Level found" });
    }
  } else {
    checks.push({ name: "CLAUDE.md", status: "fail", message: "Missing — level detection will fail" });
  }

  // 2. .superset/config.json
  const configPath = join(dir, ".superset", "config.json");
  if (existsSync(configPath)) {
    const config = await Bun.file(configPath).json();
    const usesWizrd = config.setup?.some((s: string) => s.includes("wizrd-superset"));
    if (usesWizrd) {
      checks.push({ name: ".superset/config.json", status: "pass", message: "Uses wizrd-superset" });
    } else {
      checks.push({ name: ".superset/config.json", status: "warn", message: "Exists but does not use wizrd-superset" });
    }
  } else {
    checks.push({ name: ".superset/config.json", status: "fail", message: "Missing — run 'wizrd-superset init-repo'" });
  }

  // 3. .superset/ports.json
  const portsPath = join(dir, ".superset", "ports.json");
  if (existsSync(portsPath)) {
    checks.push({ name: ".superset/ports.json", status: "pass", message: "Port config found" });
  } else {
    checks.push({ name: ".superset/ports.json", status: "warn", message: "Missing — will use defaults (web:3000)" });
  }

  // 4. .worktreeinclude
  const worktreeInclude = join(dir, ".worktreeinclude");
  if (existsSync(worktreeInclude)) {
    checks.push({ name: ".worktreeinclude", status: "pass", message: "Env files will be copied to worktrees" });
  } else {
    checks.push({ name: ".worktreeinclude", status: "warn", message: "Missing — .env files won't auto-copy to worktrees" });
  }

  // 5. .gitmodules (if expected)
  const info = await detectLevel(dir);
  if (info.level === "L0" || info.level === "L1") {
    if (hasSubmodules(dir)) {
      checks.push({ name: ".gitmodules", status: "pass", message: "Submodules found" });
    } else {
      checks.push({ name: ".gitmodules", status: "warn", message: `${info.level} but no submodules — expected?` });
    }
  }

  // 6. .gitignore includes .env.superset
  const gitignorePath = join(dir, ".gitignore");
  if (existsSync(gitignorePath)) {
    const gitignore = await Bun.file(gitignorePath).text();
    if (gitignore.includes(".env.superset")) {
      checks.push({ name: ".gitignore", status: "pass", message: ".env.superset is ignored" });
    } else {
      checks.push({ name: ".gitignore", status: "warn", message: ".env.superset not in .gitignore" });
    }
  }

  // 7. wizrd-superset binary available
  const which = Bun.spawnSync(["which", "wizrd-superset"], { stdout: "pipe" });
  if (which.exitCode === 0) {
    checks.push({ name: "wizrd-superset", status: "pass", message: "CLI found in PATH" });
  } else {
    checks.push({ name: "wizrd-superset", status: "warn", message: "CLI not in PATH — running from source?" });
  }

  // Output
  console.log("=== wizrd-superset doctor ===\n");

  const icons = { pass: "\u2713", warn: "!", fail: "\u2717" };

  for (const check of checks) {
    const icon = icons[check.status];
    console.log(`  ${icon} ${check.name}: ${check.message}`);
  }

  const fails = checks.filter((c) => c.status === "fail");
  const warns = checks.filter((c) => c.status === "warn");

  console.log("");
  if (fails.length > 0) {
    console.log(`${fails.length} issue(s) need fixing. Run 'wizrd-superset init-repo' to scaffold config.`);
  } else if (warns.length > 0) {
    console.log(`All good, ${warns.length} optional improvement(s).`);
  } else {
    console.log("Everything looks good!");
  }
}
