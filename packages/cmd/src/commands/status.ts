import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { detectLevel, detectOperator, BOLD, DIM, GREEN, YELLOW, CYAN, RED, RESET } from "@wizrd-cli/shared";

export async function status(): Promise<void> {
  const dir = process.cwd();
  const info = await detectLevel(dir);
  const op = detectOperator();

  console.log("");
  console.log(`${BOLD}  wizrd${RESET} ${DIM}— AI Operating System${RESET}`);
  console.log("");

  // Level
  const levelColor = info.level === "L0" ? CYAN : info.level === "L1" ? GREEN : info.level === "L2" ? YELLOW : RED;
  console.log(`  ${DIM}Level:${RESET}     ${levelColor}${info.level}${RESET} ${DIM}(${info.label})${RESET}`);
  console.log(`  ${DIM}Directory:${RESET} ${DIM}${dir}${RESET}`);
  console.log(`  ${DIM}Operator:${RESET}  ${op.name} ${DIM}(${op.role})${RESET}`);

  // Port allocations
  const registryPath = join(homedir(), ".wizrd-cli", "state", "port-registry.json");
  if (existsSync(registryPath)) {
    const registry = await Bun.file(registryPath).json();
    const allocs = Object.values(registry.allocations || {}) as any[];
    const active = allocs.filter((a: any) => existsSync(a.workspacePath));
    if (active.length > 0) {
      console.log(`  ${DIM}Ports:${RESET}     ${active.length} workspace(s) active`);
      for (const a of active) {
        const portsStr = Object.entries(a.ports).map(([n, p]) => `${n}:${p}`).join(", ");
        console.log(`             ${DIM}${a.workspace}${RESET} -> ${portsStr}`);
      }
    } else {
      console.log(`  ${DIM}Ports:${RESET}     No active allocations`);
    }
  }

  // Config health
  const settingsPath = join(dir, ".claude", "settings.json");
  const mcpPath = join(dir, ".mcp.json");
  const hasSettings = existsSync(settingsPath);
  const hasMcp = existsSync(mcpPath);
  const configStatus = hasSettings && hasMcp ? `${GREEN}ok${RESET}` : `${YELLOW}run 'wizrd config sync'${RESET}`;
  console.log(`  ${DIM}Config:${RESET}    ${configStatus}`);

  // Superset
  const supersetPath = join(dir, ".superset", "config.json");
  const hasSupersetConfig = existsSync(supersetPath);
  const supersetStatus = hasSupersetConfig ? `${GREEN}ok${RESET}` : `${YELLOW}run 'wizrd superset init-repo'${RESET}`;
  console.log(`  ${DIM}Superset:${RESET}  ${supersetStatus}`);

  console.log("");
}
