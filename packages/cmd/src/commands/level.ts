import { detectLevel, BOLD, DIM, CYAN, GREEN, YELLOW, RED, RESET } from "@wizrd-cli/shared";

export async function level(): Promise<void> {
  const info = await detectLevel();
  const color = info.level === "L0" ? CYAN : info.level === "L1" ? GREEN : info.level === "L2" ? YELLOW : RED;
  console.log("");
  console.log(`  ${BOLD}${color}${info.level}${RESET} ${DIM}(${info.label})${RESET}`);
  console.log(`  ${DIM}Directory:${RESET} ${info.dir}`);
  console.log("");
}
