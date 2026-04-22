import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { findL0Root, clientPath, BOLD, DIM, GREEN, RESET } from "@wizrd-cli/shared";

export async function log(args: string[]): Promise<void> {
  const clientName = args[0];
  let worklogDir: string;

  if (clientName) {
    const l0 = await findL0Root();
    if (!l0) {
      console.error("  Not inside an L0 wizrd repo.");
      process.exit(1);
    }
    const path = clientPath(l0, clientName);
    if (!path) {
      console.error(`  Client not found: ${clientName}`);
      process.exit(1);
    }
    worklogDir = join(path, "worklog");
  } else {
    worklogDir = join(process.cwd(), "worklog");
  }

  if (!existsSync(worklogDir)) {
    console.log(`  ${DIM}No worklog/ found at ${worklogDir}${RESET}`);
    return;
  }

  const files = readdirSync(worklogDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse()
    .slice(0, 10);

  console.log("");
  console.log(`  ${BOLD}Worklog${RESET} ${clientName ? `(${clientName})` : ""} ${DIM}— last ${files.length}${RESET}`);
  console.log("");

  for (const file of files) {
    const content = await Bun.file(join(worklogDir, file)).text();
    const titleMatch = content.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1] : file.replace(".md", "");
    console.log(`  ${GREEN}${file.replace(".md", "").padEnd(14)}${RESET} ${title}`);
  }
  console.log("");
}
