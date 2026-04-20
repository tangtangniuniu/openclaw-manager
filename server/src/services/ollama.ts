import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execCb);

export interface OllamaModel {
  name: string;
  id?: string;
  size?: string;
  modified?: string;
  ref: string;
}

export interface OllamaProbe {
  available: boolean;
  baseUrl: string;
  models: OllamaModel[];
  error?: string;
}

const OLLAMA_URL = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";

export async function probeOllama(): Promise<OllamaProbe> {
  try {
    const res = await fetch(`${OLLAMA_URL.replace(/\/$/, "")}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      throw new Error(`ollama /api/tags -> HTTP ${res.status}`);
    }
    const data = (await res.json()) as { models?: Array<{ name: string; size?: number; modified_at?: string; digest?: string }> };
    const models: OllamaModel[] = (data.models ?? []).map((m) => ({
      name: m.name,
      ref: `ollama/${m.name}`,
      size: m.size ? formatBytes(m.size) : undefined,
      modified: m.modified_at,
      id: m.digest?.slice(0, 12),
    }));
    return { available: true, baseUrl: OLLAMA_URL, models };
  } catch (httpErr) {
    try {
      const { stdout } = await exec("ollama list", { timeout: 10_000 });
      const models = parseOllamaListOutput(stdout);
      return { available: true, baseUrl: OLLAMA_URL, models };
    } catch (cliErr: any) {
      return {
        available: false,
        baseUrl: OLLAMA_URL,
        models: [],
        error: (httpErr as Error).message + " | " + (cliErr?.message ?? ""),
      };
    }
  }
}

function parseOllamaListOutput(stdout: string): OllamaModel[] {
  const lines = stdout.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const rows = lines.slice(1);
  return rows
    .map((line) => {
      const cols = line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
      if (cols.length === 0) return null;
      const [name, id, size, modified] = cols;
      return {
        name,
        id,
        size,
        modified,
        ref: `ollama/${name}`,
      } as OllamaModel;
    })
    .filter((m): m is OllamaModel => m !== null);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  for (const u of units) {
    if (value < 1024) return `${value.toFixed(1)} ${u}`;
    value /= 1024;
  }
  return `${value.toFixed(1)} PB`;
}
