import os from "node:os";
import path from "node:path";
import fs from "node:fs";

export const HOME = os.homedir();
export const OPENCLAW_HOME = process.env.OPENCLAW_HOME ?? path.join(HOME, ".openclaw");
export const OPENCLAW_CONFIG = process.env.OPENCLAW_CONFIG_PATH ?? path.join(OPENCLAW_HOME, "openclaw.json");

export const MANAGER_HOME = process.env.OPENCLAW_MANAGER_HOME ?? path.join(HOME, ".openclaw-manager");
export const MANAGER_LOG_DIR = path.join(MANAGER_HOME, "logs");
export const MANAGER_PID_DIR = path.join(MANAGER_HOME, "run");
export const MANAGER_BACKUP_DIR = path.join(MANAGER_HOME, "backups");
export const MANAGER_CONFIG_BACKUP_DIR = path.join(MANAGER_BACKUP_DIR, "config");
export const MANAGER_SNAPSHOT_DIR = path.join(MANAGER_BACKUP_DIR, "snapshots");

export const PORT = Number(process.env.OPENCLAW_MANAGER_PORT ?? 18790);

export function ensureDirs(): void {
  for (const dir of [MANAGER_HOME, MANAGER_LOG_DIR, MANAGER_PID_DIR, MANAGER_BACKUP_DIR, MANAGER_CONFIG_BACKUP_DIR, MANAGER_SNAPSHOT_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
