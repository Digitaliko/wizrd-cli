import { detectOperator, BOLD, DIM, GREEN, CYAN, RESET } from "@wizrd-cli/shared";

export async function whoami(): Promise<void> {
  const op = detectOperator();
  console.log("");
  console.log(`  ${BOLD}${op.name}${RESET} ${DIM}— ${op.role}${RESET}`);
  console.log(`  ${DIM}Tone:${RESET}       ${op.tone}`);
  console.log(`  ${DIM}Permission:${RESET} ${op.permissionMode}`);
  if (op.skills.includes("all")) {
    console.log(`  ${DIM}Skills:${RESET}     ${GREEN}all${RESET}`);
  } else {
    console.log(`  ${DIM}Skills:${RESET}     ${op.skills.join(", ")}`);
  }
  console.log("");
}
