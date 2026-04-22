/**
 * Operator detection — maps system username to wizrd operator role.
 */

export type OperatorName = "filip" | "peter" | "samo" | "radka" | "marko" | "unknown";

export interface OperatorInfo {
  name: OperatorName;
  role: string;
  tone: string;
  skills: string[];
  permissionMode: string;
}

const OPERATORS: Record<string, OperatorInfo> = {
  filip: {
    name: "filip",
    role: "Founder — full access",
    tone: "Direct, strategic, no hand-holding",
    skills: ["all"],
    permissionMode: "acceptEdits",
  },
  peter: {
    name: "peter",
    role: "Coordinator / QA / Sales",
    tone: "Clear instructions, structured handoffs",
    skills: ["w-prospect", "w-pipeline", "w-delegate", "w-support-client", "w-status"],
    permissionMode: "default",
  },
  samo: {
    name: "samo",
    role: "Developer",
    tone: "Technical, spec-focused, architecture context",
    skills: ["w-plan", "w-execute", "w-review", "w-support-client", "w-status"],
    permissionMode: "acceptEdits",
  },
  radka: {
    name: "radka",
    role: "Admin / Operations",
    tone: "Clear, step-by-step, process-oriented",
    skills: ["w-finance", "w-invoice-client", "w-status"],
    permissionMode: "default",
  },
  marko: {
    name: "marko",
    role: "Designer",
    tone: "Creative brief format, visual references",
    skills: ["w-status", "w-brand-voice"],
    permissionMode: "default",
  },
};

export function detectOperator(): OperatorInfo {
  const username = Bun.spawnSync(["whoami"], { stdout: "pipe" }).stdout.toString().trim();
  return OPERATORS[username] || {
    name: "unknown" as OperatorName,
    role: "Unknown operator",
    tone: "Professional",
    skills: ["w-status"],
    permissionMode: "default",
  };
}
