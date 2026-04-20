import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const managerRoot = process.cwd();
export const openclawHome =
  process.env.OPENCLAW_MANAGER_OPENCLAW_HOME ?? path.join(os.homedir(), ".openclaw");
export const configPath = path.join(openclawHome, "openclaw.json");
export const skillsDir = path.join(openclawHome, "skills");
export const backupsDir = path.join(managerRoot, "data", "backups");
export const runtimeDir = path.join(managerRoot, "data", "runtime");
export const gatewayStatePath = path.join(runtimeDir, "gateway-process.json");
export const gatewayLogPath = path.join(runtimeDir, "gateway.log");

for (const dir of [backupsDir, runtimeDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

export function ensureDir(target: string) {
  fs.mkdirSync(target, { recursive: true });
}

