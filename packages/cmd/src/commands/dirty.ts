import { BOLD, DIM, GREEN, YELLOW, RED, RESET } from "@wizrd-cli/shared";

export async function dirty(): Promise<void> {
  // Check root repo
  const rootStatus = Bun.spawnSync(["git", "status", "--porcelain"], { stdout: "pipe" });
  const rootLines = rootStatus.stdout.toString().trim().split("\n").filter(Boolean);

  // Check submodules
  const subResult = Bun.spawnSync(
    ["git", "submodule", "foreach", "--recursive", "--quiet", "echo $sm_path && git status --porcelain"],
    { stdout: "pipe" }
  );
  const subOutput = subResult.stdout.toString().trim();

  console.log("");
  console.log(`  ${BOLD}Dirty check${RESET}`);
  console.log("");

  // Root
  if (rootLines.length > 0 && rootLines[0] !== "") {
    console.log(`  ${YELLOW}root${RESET} ${DIM}(${rootLines.length} changes)${RESET}`);
    for (const line of rootLines.slice(0, 5)) {
      console.log(`    ${DIM}${line}${RESET}`);
    }
    if (rootLines.length > 5) {
      console.log(`    ${DIM}... and ${rootLines.length - 5} more${RESET}`);
    }
  } else {
    console.log(`  ${GREEN}root${RESET} ${DIM}clean${RESET}`);
  }

  // Parse submodule output
  if (subOutput) {
    const blocks = subOutput.split("\n");
    let currentModule = "";
    let moduleChanges: string[] = [];

    const flush = () => {
      if (currentModule && moduleChanges.length > 0) {
        console.log(`  ${YELLOW}${currentModule}${RESET} ${DIM}(${moduleChanges.length} changes)${RESET}`);
        for (const c of moduleChanges.slice(0, 3)) {
          console.log(`    ${DIM}${c}${RESET}`);
        }
        if (moduleChanges.length > 3) {
          console.log(`    ${DIM}... and ${moduleChanges.length - 3} more${RESET}`);
        }
      }
    };

    for (const line of blocks) {
      if (!line.startsWith(" ") && !line.startsWith("?") && !line.startsWith("M") && !line.startsWith("A") && !line.startsWith("D")) {
        flush();
        currentModule = line;
        moduleChanges = [];
      } else if (line.trim()) {
        moduleChanges.push(line.trim());
      }
    }
    flush();
  }

  console.log("");
}
