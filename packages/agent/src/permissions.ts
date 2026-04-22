/**
 * Map operator to Claude Code CLI flags: --allowedTools and --permission-mode.
 */

import type { OperatorInfo } from "@wizrd-cli/shared";

// Base tools everyone gets
const BASE_TOOLS = [
  "Read",
  "Edit",
  "Write",
  "Glob",
  "Grep",
  "Bash(ls *)",
  "Bash(cat *)",
  "Bash(git status *)",
  "Bash(git log *)",
  "Bash(git diff *)",
  "Bash(git branch *)",
  "Bash(git fetch *)",
];

// Extended tools for developers
const DEV_TOOLS = [
  ...BASE_TOOLS,
  "Bash(git add *)",
  "Bash(git commit *)",
  "Bash(git stash *)",
  "Bash(git checkout *)",
  "Bash(bun *)",
  "Bash(npm *)",
  "Bash(pnpm *)",
  "Bash(npx *)",
  "Bash(tsc *)",
  "Bash(vitest *)",
  "Bash(eslint *)",
  "Bash(prettier *)",
  "WebSearch",
  "WebFetch",
];

// Full access for founder
const ALL_TOOLS = [
  ...DEV_TOOLS,
  "Bash(gh *)",
  "Bash(gws *)",
  "Bash(gemini *)",
  "Bash(vercel *)",
  "Bash(curl *)",
  "Bash(docker *)",
  "mcp__*",
];

const OPERATOR_TOOLS: Record<string, string[]> = {
  filip: ALL_TOOLS,
  samo: DEV_TOOLS,
  peter: [...BASE_TOOLS, "WebSearch", "WebFetch", "Bash(gh *)"],
  radka: [...BASE_TOOLS, "Bash(gws *)"],
  marko: BASE_TOOLS,
};

export function getAllowedTools(operator: OperatorInfo): string[] {
  return OPERATOR_TOOLS[operator.name] || BASE_TOOLS;
}

export function getPermissionMode(operator: OperatorInfo): string {
  return operator.permissionMode;
}
