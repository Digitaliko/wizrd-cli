import { join } from "path";
import { existsSync } from "fs";
import { findL0Root, clientPath } from "@wizrd-cli/shared";

export async function cd(args: string[]): Promise<void> {
  const clientName = args[0];
  const serviceName = args[1];

  if (!clientName) {
    console.error("Usage: wizrd cmd cd <client> [service]");
    process.exit(1);
  }

  const l0 = await findL0Root();
  if (!l0) {
    console.error("Not inside an L0 wizrd repo.");
    process.exit(1);
  }

  const path = clientPath(l0, clientName);
  if (!path) {
    console.error(`Client not found: ${clientName}`);
    process.exit(1);
  }

  if (serviceName) {
    const svcPath = join(path, "services", serviceName);
    if (!existsSync(svcPath)) {
      console.error(`Service not found: ${serviceName} in ${clientName}`);
      process.exit(1);
    }
    // Print path only — use with: cd $(wizrd cmd cd kiaba ispediter)
    process.stdout.write(svcPath);
  } else {
    process.stdout.write(path);
  }
}
