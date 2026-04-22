/**
 * Assemble the wizrd system prompt from templates.
 * Reads core.md + level template + operator template and concatenates.
 */

import { join } from "path";
import type { WizrdLevel } from "@wizrd-cli/shared";
import type { OperatorName } from "@wizrd-cli/shared";

const TEMPLATES_DIR = join(import.meta.dir, "..", "templates");

async function readTemplate(name: string): Promise<string> {
  const path = join(TEMPLATES_DIR, name);
  try {
    return await Bun.file(path).text();
  } catch {
    return "";
  }
}

export async function assemblePrompt(
  level: WizrdLevel,
  operator: OperatorName
): Promise<string> {
  const parts: string[] = [];

  // Always include core
  parts.push(await readTemplate("core.md"));

  // Level-specific
  const levelFile = level === "unknown" ? "l0.md" : `${level.toLowerCase()}.md`;
  parts.push(await readTemplate(levelFile));

  // Operator-specific
  if (operator !== "unknown") {
    parts.push(await readTemplate(`operator-${operator}.md`));
  }

  return parts.filter(Boolean).join("\n\n---\n\n");
}
