import { BOLD, DIM, CYAN, RESET } from "@wizrd-cli/shared";

export async function doctor(): Promise<void> {
  console.log("");
  console.log(`${BOLD}  wizrd doctor${RESET} ${DIM}— system health check${RESET}`);
  console.log("");

  const packages = [
    { name: "config", bin: "wizrd-config" },
    { name: "superset", bin: "wizrd-superset" },
  ];

  for (const pkg of packages) {
    console.log(`  ${CYAN}--- ${pkg.name} ---${RESET}`);
    const proc = Bun.spawn([pkg.bin, "doctor"], {
      stdout: "inherit",
      stderr: "inherit",
      env: process.env as Record<string, string>,
    });
    await proc.exited;
    console.log("");
  }
}
