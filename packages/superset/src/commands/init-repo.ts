/**
 * wizrd-superset init-repo
 *
 * Scaffold .superset/ configuration files in the current repo.
 * Creates:
 *   - .superset/config.json
 *   - .superset/ports.json (if --ports flag or interactive)
 *   - .worktreeinclude (if missing)
 */

import { existsSync, mkdirSync } from "fs";
import { join, basename } from "path";
import { detectLevel } from "@wizrd-cli/shared";

export async function initRepo(): Promise<void> {
  const dir = process.cwd();
  const info = await detectLevel(dir);

  console.log(`=== wizrd-superset init-repo ===`);
  console.log(`  Level: ${info.level} (${info.label})`);
  console.log(`  Directory: ${dir}`);
  console.log("");

  const supersetDir = join(dir, ".superset");
  if (!existsSync(supersetDir)) {
    mkdirSync(supersetDir, { recursive: true });
  }

  // 1. .superset/config.json
  const configPath = join(supersetDir, "config.json");
  if (existsSync(configPath)) {
    console.log("  .superset/config.json already exists, skipping");
  } else {
    const config = {
      setup: ["wizrd-superset setup"],
      run: ["wizrd-superset run"],
      teardown: ["wizrd-superset teardown"],
    };
    await Bun.write(configPath, JSON.stringify(config, null, 2) + "\n");
    console.log("  Created .superset/config.json");
  }

  // 2. .superset/ports.json (default)
  const portsPath = join(supersetDir, "ports.json");
  if (existsSync(portsPath)) {
    console.log("  .superset/ports.json already exists, skipping");
  } else {
    const portsConfig = {
      services: [{ name: "web", default_port: 3000, env_var: "PORT" }],
    };
    await Bun.write(portsPath, JSON.stringify(portsConfig, null, 2) + "\n");
    console.log("  Created .superset/ports.json");
  }

  // 3. .worktreeinclude
  const worktreeIncludePath = join(dir, ".worktreeinclude");
  if (existsSync(worktreeIncludePath)) {
    console.log("  .worktreeinclude already exists, skipping");
  } else {
    const worktreeInclude = [".env", ".env.local", ".env.development.local", ""].join(
      "\n"
    );
    await Bun.write(worktreeIncludePath, worktreeInclude);
    console.log("  Created .worktreeinclude");
  }

  // 4. Add .env.superset to .gitignore if not already there
  const gitignorePath = join(dir, ".gitignore");
  if (existsSync(gitignorePath)) {
    const gitignore = await Bun.file(gitignorePath).text();
    if (!gitignore.includes(".env.superset")) {
      await Bun.write(gitignorePath, gitignore.trimEnd() + "\n.env.superset\n");
      console.log("  Added .env.superset to .gitignore");
    }
  }

  console.log("");
  console.log("=== Init complete ===");
  console.log("Next: commit these files, then 'wizrd-superset setup' in a Superset workspace.");
}
