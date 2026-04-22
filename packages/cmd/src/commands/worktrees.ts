import { BOLD, DIM, GREEN, YELLOW, RESET } from "@wizrd-cli/shared";

export async function worktrees(): Promise<void> {
  const result = Bun.spawnSync(["git", "worktree", "list"], { stdout: "pipe" });
  const lines = result.stdout.toString().trim().split("\n").filter(Boolean);

  console.log("");
  console.log(`  ${BOLD}Worktrees${RESET} ${DIM}(${lines.length})${RESET}`);
  console.log("");

  for (const line of lines) {
    // Format: /path/to/worktree  abc1234 [branch-name]
    const match = line.match(/^(\S+)\s+(\S+)\s+\[?([^\]]*)\]?/);
    if (match) {
      const [, path, hash, branch] = match;
      const isMain = branch === "main" || branch === "master";
      const color = isMain ? DIM : GREEN;
      console.log(`  ${color}${branch.padEnd(30)}${RESET} ${DIM}${path}${RESET}`);
    } else {
      console.log(`  ${line}`);
    }
  }
  console.log("");
}
