import fs from "node:fs";
import path from "node:path";
import * as tar from "tar";
import { OPENCLAW_HOME, MANAGER_SNAPSHOT_DIR, ensureDirs } from "../util/paths.js";

export interface SnapshotInfo {
  name: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
  note?: string;
}

const SAFE_SKIP = new Set(["logs"]);

export function listSnapshots(): SnapshotInfo[] {
  ensureDirs();
  if (!fs.existsSync(MANAGER_SNAPSHOT_DIR)) return [];
  return fs
    .readdirSync(MANAGER_SNAPSHOT_DIR)
    .filter((f) => f.endsWith(".tar.gz"))
    .map((f) => {
      const full = path.join(MANAGER_SNAPSHOT_DIR, f);
      const stat = fs.statSync(full);
      const meta = readMeta(full);
      return {
        name: f,
        path: full,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
        note: meta?.note,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function readMeta(tarPath: string): { note?: string } | undefined {
  const metaPath = tarPath.replace(/\.tar\.gz$/, ".json");
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch {
    return undefined;
  }
}

export async function createSnapshot(note = ""): Promise<SnapshotInfo> {
  ensureDirs();
  if (!fs.existsSync(OPENCLAW_HOME)) {
    const err = new Error(`${OPENCLAW_HOME} does not exist; nothing to back up`);
    (err as any).status = 400;
    throw err;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fname = `openclaw-${stamp}.tar.gz`;
  const full = path.join(MANAGER_SNAPSHOT_DIR, fname);
  const entries = fs
    .readdirSync(OPENCLAW_HOME)
    .filter((e) => !SAFE_SKIP.has(e));
  await tar.create(
    {
      gzip: true,
      file: full,
      cwd: OPENCLAW_HOME,
      portable: true,
      follow: false,
    },
    entries
  );
  const stat = fs.statSync(full);
  if (note) {
    fs.writeFileSync(full.replace(/\.tar\.gz$/, ".json"), JSON.stringify({ note, createdAt: new Date().toISOString() }, null, 2));
  }
  return {
    name: fname,
    path: full,
    sizeBytes: stat.size,
    createdAt: stat.mtime.toISOString(),
    note: note || undefined,
  };
}

export async function restoreSnapshot(name: string): Promise<{ restored: string; autoBackup: SnapshotInfo }> {
  const target = path.join(MANAGER_SNAPSHOT_DIR, path.basename(name));
  const rel = path.relative(MANAGER_SNAPSHOT_DIR, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    const err = new Error("invalid snapshot name");
    (err as any).status = 400;
    throw err;
  }
  if (!fs.existsSync(target)) {
    const err = new Error(`snapshot ${name} not found`);
    (err as any).status = 404;
    throw err;
  }
  const autoBackup = await createSnapshot(`auto-before-restore:${path.basename(name)}`);
  fs.mkdirSync(OPENCLAW_HOME, { recursive: true });
  await tar.extract({
    file: target,
    cwd: OPENCLAW_HOME,
  });
  return { restored: target, autoBackup };
}

export function deleteSnapshot(name: string): void {
  const target = path.join(MANAGER_SNAPSHOT_DIR, path.basename(name));
  const rel = path.relative(MANAGER_SNAPSHOT_DIR, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    const err = new Error("invalid snapshot name");
    (err as any).status = 400;
    throw err;
  }
  if (fs.existsSync(target)) fs.rmSync(target);
  const metaPath = target.replace(/\.tar\.gz$/, ".json");
  if (fs.existsSync(metaPath)) fs.rmSync(metaPath);
}
