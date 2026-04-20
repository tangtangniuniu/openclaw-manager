import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { backupsDir, openclawHome } from "../lib/paths.js";
import type { BackupSummary } from "../../shared/types.js";

const execFileAsync = promisify(execFile);

export async function listBackups(): Promise<BackupSummary[]> {
  await fs.mkdir(backupsDir, { recursive: true });
  const entries = await fs.readdir(backupsDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".tar.gz"));

  const stats = await Promise.all(
    files.map(async (entry) => {
      const filePath = path.join(backupsDir, entry.name);
      const stat = await fs.stat(filePath);
      return {
        name: entry.name,
        createdAt: stat.birthtime.toISOString(),
        sizeBytes: stat.size
      };
    })
  );

  return stats.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createBackup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `openclaw-${stamp}.tar.gz`;
  const archivePath = path.join(backupsDir, fileName);

  await execFileAsync("tar", ["-czf", archivePath, "-C", path.dirname(openclawHome), path.basename(openclawHome)]);

  return archivePath;
}

export async function restoreBackup(name: string) {
  const source = path.join(backupsDir, name);
  await fs.access(source);
  await createBackup();
  await execFileAsync("tar", ["-xzf", source, "-C", path.dirname(openclawHome)]);
}

