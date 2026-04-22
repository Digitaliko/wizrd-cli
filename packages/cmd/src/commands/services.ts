import { detectLevel, listServices, BOLD, DIM, GREEN, RESET } from "@wizrd-cli/shared";

export async function services(): Promise<void> {
  const info = await detectLevel();
  const svcList = listServices(info.dir);

  console.log("");
  if (svcList.length === 0) {
    console.log(`  ${DIM}No services/ directory found at ${info.dir}${RESET}`);
  } else {
    console.log(`  ${BOLD}Services${RESET} ${DIM}(${svcList.length})${RESET}`);
    console.log("");
    for (const svc of svcList) {
      console.log(`  ${GREEN}${svc}${RESET}`);
    }
  }
  console.log("");
}
