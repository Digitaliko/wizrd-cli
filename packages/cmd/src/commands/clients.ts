import { existsSync } from "fs";
import { join } from "path";
import { findL0Root, listClients, clientPath, listServices, BOLD, DIM, GREEN, YELLOW, CYAN, RESET } from "@wizrd-cli/shared";

export async function clients(args: string[]): Promise<void> {
  const l0 = await findL0Root();
  if (!l0) {
    console.error("  Not inside an L0 wizrd repo. Run from digitaliko-wizrd root.");
    process.exit(1);
  }

  const clientName = args[0];

  if (clientName) {
    // Show single client detail
    const path = clientPath(l0, clientName);
    if (!path) {
      console.error(`  Client not found: ${clientName}`);
      process.exit(1);
    }

    console.log("");
    console.log(`  ${BOLD}${clientName}${RESET}`);
    console.log(`  ${DIM}Path:${RESET} ${path}`);

    // Check for CLAUDE.md
    const claudeMd = join(path, "CLAUDE.md");
    if (existsSync(claudeMd)) {
      const content = await Bun.file(claudeMd).text();
      const levelMatch = content.match(/##\s*Wizrd Level:\s*(L[012])\s*\(([^)]+)\)/i);
      if (levelMatch) {
        console.log(`  ${DIM}Level:${RESET} ${levelMatch[1]} (${levelMatch[2]})`);
      }
    }

    // Services
    const services = listServices(path);
    if (services.length > 0) {
      console.log(`  ${DIM}Services:${RESET}`);
      for (const svc of services) {
        console.log(`    ${GREEN}${svc}${RESET}`);
      }
    } else {
      console.log(`  ${DIM}Services:${RESET} none`);
    }

    // Last git activity
    const gitLog = Bun.spawnSync(
      ["git", "log", "-1", "--format=%cr — %s"],
      { stdout: "pipe", cwd: path }
    );
    const lastCommit = gitLog.stdout.toString().trim();
    if (lastCommit) {
      console.log(`  ${DIM}Last commit:${RESET} ${lastCommit}`);
    }

    console.log("");
    return;
  }

  // List all clients
  const allClients = listClients(l0);

  console.log("");
  console.log(`  ${BOLD}Clients${RESET} ${DIM}(${allClients.length})${RESET}`);
  console.log("");

  for (const name of allClients) {
    const path = clientPath(l0, name);
    if (!path) continue;

    const services = listServices(path);
    const svcStr = services.length > 0 ? `${DIM}${services.join(", ")}${RESET}` : `${DIM}no services${RESET}`;

    const hasWizrd = existsSync(join(l0, "clients", name, "wizrd"));
    const marker = hasWizrd ? GREEN : YELLOW;

    console.log(`  ${marker}${name.padEnd(20)}${RESET} ${svcStr}`);
  }
  console.log("");
}
