import { exec as execCb, spawn } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";

const exec = promisify(execCb);

export interface GatewayStatus {
  running: boolean;
  pid?: number;
  port?: number;
  mode?: string;
  bind?: string;
  service?: string;
  dashboard?: string;
  raw: string;
  error?: string;
}

const OPENCLAW = process.env.OPENCLAW_BIN ?? "openclaw";
const DEFAULT_TIMEOUT = 30_000;

function parseStatus(stdout: string): GatewayStatus {
  const pidMatch = stdout.match(/pid\s+(\d+)/i);
  const portMatch = stdout.match(/port[:=\s]+(\d+)/i);
  const bindMatch = stdout.match(/bind[:=\s]+([a-z-]+)/i);
  const modeMatch = stdout.match(/Gateway:[^\n]*mode=([a-z-]+)/i);
  const serviceMatch = stdout.match(/Service:\s+([^\n]+)/);
  const dashboardMatch = stdout.match(/Dashboard:\s+(\S+)/);
  const running = /Runtime:\s+running/i.test(stdout) || /active \(running\)/i.test(stdout);
  return {
    running,
    pid: pidMatch ? Number(pidMatch[1]) : undefined,
    port: portMatch ? Number(portMatch[1]) : undefined,
    bind: bindMatch ? bindMatch[1] : undefined,
    mode: modeMatch ? modeMatch[1] : undefined,
    service: serviceMatch ? serviceMatch[1].trim() : undefined,
    dashboard: dashboardMatch ? dashboardMatch[1] : undefined,
    raw: stdout.slice(0, 4000),
  };
}

export async function getStatus(): Promise<GatewayStatus> {
  try {
    const { stdout } = await exec(`${OPENCLAW} gateway status`, { timeout: DEFAULT_TIMEOUT });
    return parseStatus(stdout);
  } catch (err: any) {
    const stdout: string = err?.stdout ?? "";
    const stderr: string = err?.stderr ?? err?.message ?? "";
    const status = parseStatus(stdout);
    return { ...status, error: stderr.trim() || undefined };
  }
}

async function runSubcommand(cmd: "start" | "stop" | "restart"): Promise<{ output: string; error?: string }> {
  try {
    const { stdout, stderr } = await exec(`${OPENCLAW} gateway ${cmd}`, { timeout: DEFAULT_TIMEOUT });
    return { output: (stdout + stderr).trim() };
  } catch (err: any) {
    return {
      output: ((err?.stdout ?? "") + (err?.stderr ?? err?.message ?? "")).trim(),
      error: err?.stderr?.trim() || err?.message,
    };
  }
}

export async function startGateway() {
  return runSubcommand("start");
}
export async function stopGateway() {
  return runSubcommand("stop");
}
export async function restartGateway() {
  return runSubcommand("restart");
}

export async function tailLogs(lines = 300): Promise<{ file: string | null; content: string }> {
  const dir = "/tmp/openclaw";
  if (!fs.existsSync(dir)) return { file: null, content: "" };
  const entries = fs.readdirSync(dir)
    .filter((f) => f.endsWith(".log"))
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (!entries.length) return { file: null, content: "" };
  const file = path.join(dir, entries[0].f);
  return new Promise((resolve) => {
    const child = spawn("tail", ["-n", String(lines), file]);
    let buf = "";
    child.stdout.on("data", (d) => (buf += d.toString()));
    child.on("close", () => resolve({ file, content: buf }));
    child.on("error", () => resolve({ file, content: fs.readFileSync(file, "utf8").split("\n").slice(-lines).join("\n") }));
  });
}

export async function probeHealth(): Promise<{ ok: boolean; raw: string; error?: string }> {
  try {
    const { stdout } = await exec(`${OPENCLAW} gateway health`, { timeout: 10_000 });
    return { ok: true, raw: stdout };
  } catch (err: any) {
    return { ok: false, raw: (err?.stdout ?? "") + (err?.stderr ?? ""), error: err?.message };
  }
}
