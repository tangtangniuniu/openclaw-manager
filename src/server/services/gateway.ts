import fs from "node:fs";
import fsp from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { configPath, gatewayLogPath, gatewayStatePath } from "../lib/paths.js";
import { delay, isPortOpen } from "../lib/utils.js";
import { readConfig } from "./config.js";
import type { GatewayState } from "../../shared/types.js";

const execFileAsync = promisify(execFile);

type GatewayRuntimeState = {
  pid: number;
  startedAt: string;
  port: number;
  configPath: string;
};

async function readManagedState(): Promise<GatewayRuntimeState | null> {
  try {
    const raw = await fsp.readFile(gatewayStatePath, "utf8");
    return JSON.parse(raw) as GatewayRuntimeState;
  } catch {
    return null;
  }
}

function isAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function writeManagedState(state: GatewayRuntimeState) {
  await fsp.writeFile(gatewayStatePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function clearManagedState() {
  await fsp.rm(gatewayStatePath, { force: true });
}

export async function getGatewayState(): Promise<GatewayState> {
  const config = await readConfig();
  const port = config.gateway?.port ?? 18789;
  const managedState = await readManagedState();
  const managedAlive = managedState?.pid ? isAlive(managedState.pid) : false;
  const portOpen = await isPortOpen(port);
  const serviceStatus = await readServiceStatus();

  if (managedState && !managedAlive) {
    await clearManagedState();
  }

  const status: GatewayState["status"] = managedAlive
    ? "running"
    : serviceStatus.running || portOpen
      ? "external"
      : "stopped";

  return {
    status,
    port,
    bind: config.gateway?.bind ?? "loopback",
    authMode: config.gateway?.auth?.mode ?? "unknown",
    pid: managedAlive ? managedState?.pid ?? null : null,
    portOpen,
    managed: managedAlive,
    logPath: gatewayLogPath,
    note:
      status === "external"
        ? serviceStatus.note || "检测到外部 gateway 正在运行。"
        : status === "running"
          ? "管理器正在托管 gateway 进程。"
          : "gateway 当前未运行。"
  };
}

export async function startGateway() {
  const current = await getGatewayState();

  if (current.status === "running") {
    return current;
  }

  if (current.status === "external") {
    try {
      await execFileAsync("openclaw", ["gateway", "start"], { timeout: 120000 });
      return getGatewayState();
    } catch (error) {
      throw new Error(`检测到外部 gateway 已运行，且服务启动失败: ${toMessage(error)}`);
    }
  }

  if (await tryServiceCommand("start")) {
    return getGatewayState();
  }

  const config = await readConfig();
  const port = config.gateway?.port ?? 18789;
  const logStream = fs.createWriteStream(gatewayLogPath, { flags: "a" });
  const child = spawn(
    "openclaw",
    ["gateway", "run", "--port", String(port), "--verbose"],
    {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  child.stdout?.pipe(logStream);
  child.stderr?.pipe(logStream);
  child.unref();

  await writeManagedState({
    pid: child.pid ?? 0,
    startedAt: new Date().toISOString(),
    port,
    configPath
  });

  for (let attempt = 0; attempt < 15; attempt += 1) {
    if (await isPortOpen(port)) {
      break;
    }

    await delay(500);
  }

  return getGatewayState();
}

export async function stopGateway() {
  if (await tryServiceCommand("stop")) {
    return getGatewayState();
  }

  const managed = await readManagedState();

  if (!managed || !isAlive(managed.pid)) {
    await clearManagedState();
    return getGatewayState();
  }

  process.kill(managed.pid, "SIGTERM");

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (!isAlive(managed.pid)) {
      await clearManagedState();
      return getGatewayState();
    }

    await delay(400);
  }

  process.kill(managed.pid, "SIGKILL");
  await clearManagedState();
  return getGatewayState();
}

export async function restartGateway() {
  if (await tryServiceCommand("restart")) {
    return getGatewayState();
  }

  await stopGateway();
  return startGateway();
}

export async function readGatewayLog(lines = 120) {
  try {
    const raw = await fsp.readFile(gatewayLogPath, "utf8");
    return raw.split("\n").slice(-lines).join("\n");
  } catch {
    return "";
  }
}

async function tryServiceCommand(command: "start" | "stop" | "restart") {
  try {
    await execFileAsync("openclaw", ["gateway", command], { timeout: 120000 });
    return true;
  } catch (error) {
    const message = toMessage(error);

    if (
      message.includes("systemd") ||
      message.includes("launchd") ||
      message.includes("schtasks") ||
      message.includes("service")
    ) {
      return false;
    }

    throw error;
  }
}

async function readServiceStatus() {
  try {
    const { stdout } = await execFileAsync("openclaw", ["gateway", "status"], {
      timeout: 120000
    });

    const running = stdout.includes("Runtime: running");
    const note = stdout
      .split("\n")
      .find((line) => line.startsWith("Runtime:") || line.startsWith("Service:"));

    return {
      running,
      note: note ?? ""
    };
  } catch {
    return {
      running: false,
      note: ""
    };
  }
}

function toMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
