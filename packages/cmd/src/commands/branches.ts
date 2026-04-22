import { BOLD, DIM, GREEN, CYAN, RESET } from "@wizrd-cli/shared";

export async function branches(): Promise<void> {
  // Current repo branch
  const currentBranch = Bun.spawnSync(["git", "branch", "--show-current"], { stdout: "pipe" })
    .stdout.toString().trim();

  // All local branches
  const branchResult = Bun.spawnSync(["git", "branch", "--format=%(refname:short)"], { stdout: "pipe" });
  const allBranches = branchResult.stdout.toString().trim().split("\n").filter(Boolean);

  console.log("");
  console.log(`  ${BOLD}Branches${RESET}`);
  console.log("");
  console.log(`  ${CYAN}root${RESET}`);
  for (const b of allBranches) {
    const marker = b === currentBranch ? `${GREEN}* ${b}${RESET}` : `  ${DIM}${b}${RESET}`;
    console.log(`    ${marker}`);
  }

  // Submodule branches
  const subResult = Bun.spawnSync(
    ["git", "submodule", "foreach", "--quiet", "echo $sm_path && git branch --show-current"],
    { stdout: "pipe" }
  );
  const subOutput = subResult.stdout.toString().trim();
  if (subOutput) {
    const lines = subOutput.split("\n");
    for (let i = 0; i < lines.length; i += 2) {
      const module = lines[i];
      const branch = lines[i + 1] || "(detached)";
      if (branch && branch !== "main" && branch !== "master") {
        console.log(`  ${CYAN}${module}${RESET} → ${GREEN}${branch}${RESET}`);
      }
    }
  }

  console.log("");
}
