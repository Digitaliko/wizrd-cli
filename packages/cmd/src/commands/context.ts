import { detectLevel, detectOperator, BOLD, DIM, CYAN, GREEN, YELLOW, RED, RESET } from "@wizrd-cli/shared";

export async function context(): Promise<void> {
  const info = await detectLevel();
  const op = detectOperator();
  const levelColor = info.level === "L0" ? CYAN : info.level === "L1" ? GREEN : info.level === "L2" ? YELLOW : RED;

  console.log("");
  console.log(`  ${BOLD}wizrd context${RESET}`);
  console.log("");
  console.log(`  ${DIM}Operator:${RESET}  ${BOLD}${op.name}${RESET} (${op.role})`);
  console.log(`  ${DIM}Level:${RESET}     ${levelColor}${info.level}${RESET} (${info.label})`);
  console.log(`  ${DIM}Directory:${RESET} ${info.dir}`);
  console.log(`  ${DIM}Mode:${RESET}      ${op.permissionMode}`);

  // Show active worktrees
  const wt = Bun.spawnSync(["git", "worktree", "list", "--porcelain"], { stdout: "pipe", cwd: info.dir });
  const worktrees = wt.stdout.toString().split("\n\n").filter(Boolean);
  if (worktrees.length > 1) {
    console.log(`  ${DIM}Worktrees:${RESET} ${worktrees.length - 1} active`);
  }
  console.log("");
}
