import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { readConfig } from "./config.js";

const exec = promisify(execCb);

const OPENCLAW = process.env.OPENCLAW_BIN ?? "openclaw";

export interface AgentInfo {
  id: string;
  default?: boolean;
  skills?: string[];
  workspace?: string;
}

export function listAgents(): AgentInfo[] {
  const summary = readConfig();
  const raw = summary.raw as any;
  const list: any[] = Array.isArray(raw?.agents?.list) ? raw.agents.list : [];
  if (list.length === 0) {
    return [{ id: "main", default: true }];
  }
  return list.map((a) => ({
    id: String(a.id),
    default: Boolean(a.default),
    skills: Array.isArray(a.skills) ? a.skills.map(String) : undefined,
    workspace: a.workspace ? String(a.workspace) : undefined,
  }));
}

export interface TestAgentArgs {
  agentId?: string;
  message: string;
  thinking?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  timeoutSeconds?: number;
}

export interface TestAgentResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
  exitCode: number | null;
  command: string;
}

function escape(arg: string): string {
  return `"${arg.replace(/(["\\$`])/g, "\\$1")}"`;
}

export async function testAgent(args: TestAgentArgs): Promise<TestAgentResult> {
  if (!args.message || !args.message.trim()) {
    const err = new Error("message is required");
    (err as any).status = 400;
    throw err;
  }
  const parts = [`${OPENCLAW} agent`, `--message ${escape(args.message)}`];
  if (args.agentId) parts.push(`--agent ${escape(args.agentId)}`);
  if (args.thinking) parts.push(`--thinking ${args.thinking}`);
  const timeoutSec = args.timeoutSeconds ?? 120;
  parts.push(`--timeout ${timeoutSec}`);
  const command = parts.join(" ");
  const start = Date.now();
  try {
    const { stdout, stderr } = await exec(command, {
      timeout: (timeoutSec + 15) * 1000,
      maxBuffer: 16 * 1024 * 1024,
    });
    return {
      ok: true,
      stdout,
      stderr,
      durationMs: Date.now() - start,
      exitCode: 0,
      command,
    };
  } catch (err: any) {
    return {
      ok: false,
      stdout: err?.stdout ?? "",
      stderr: err?.stderr ?? err?.message ?? "",
      durationMs: Date.now() - start,
      exitCode: typeof err?.code === "number" ? err.code : null,
      command,
    };
  }
}
