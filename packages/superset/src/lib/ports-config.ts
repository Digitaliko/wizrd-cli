/**
 * Read .superset/ports.json to get declared service ports.
 * Falls back to sensible defaults if no config exists.
 */

import { existsSync } from "fs";
import { join } from "path";

export interface ServicePort {
  name: string;
  default_port: number;
  env_var: string;
}

export interface PortsConfig {
  services: ServicePort[];
  /**
   * When true, `setup` auto-shifts to the next free port offset if 0 is taken.
   * When false/missing (default), `setup` errors if 0 is taken so the operator
   * makes an explicit choice. Equivalent to passing --shift on the CLI.
   */
  autoShift?: boolean;
}

const DEFAULT_PORTS: PortsConfig = {
  services: [{ name: "web", default_port: 3000, env_var: "PORT" }],
};

/**
 * Load ports config from .superset/ports.json or return defaults.
 */
export async function loadPortsConfig(dir: string): Promise<PortsConfig> {
  const configPath = join(dir, ".superset", "ports.json");

  if (!existsSync(configPath)) {
    return DEFAULT_PORTS;
  }

  const content = await Bun.file(configPath).text();
  return JSON.parse(content) as PortsConfig;
}

/**
 * Convert PortsConfig to a name→port map
 */
export function portsToMap(config: PortsConfig): Record<string, number> {
  const map: Record<string, number> = {};
  for (const svc of config.services) {
    map[svc.name] = svc.default_port;
  }
  return map;
}
