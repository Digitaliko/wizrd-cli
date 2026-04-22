export async function ports(): Promise<void> {
  const proc = Bun.spawn(["wizrd-superset", "ports"], {
    stdout: "inherit",
    stderr: "inherit",
    env: process.env as Record<string, string>,
  });
  const exitCode = await proc.exited;
  process.exit(exitCode);
}
