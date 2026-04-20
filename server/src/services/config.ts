import fs from "node:fs";
import path from "node:path";
import JSON5 from "json5";
import { OPENCLAW_CONFIG, MANAGER_CONFIG_BACKUP_DIR, ensureDirs } from "../util/paths.js";

export interface ConfigSummary {
  path: string;
  exists: boolean;
  sizeBytes: number;
  mtime: string | null;
  gateway: {
    port?: number;
    mode?: string;
    bind?: string;
    authMode?: string;
  };
  model: {
    primary?: string;
    fallbacks?: string[];
    catalog: string[];
  };
  agents: {
    workspace?: string;
    list: { id: string; default?: boolean }[];
  };
  plugins: string[];
  channels: string[];
  raw: unknown;
  rawText: string;
}

export interface SavePayload {
  rawText: string;
}

function toConfigSummary(raw: unknown, rawText: string, stat: fs.Stats | null): ConfigSummary {
  const cfg = (raw ?? {}) as Record<string, any>;
  const gateway = cfg.gateway ?? {};
  const agentsSection = cfg.agents ?? {};
  const defaults = agentsSection.defaults ?? {};
  const list: any[] = Array.isArray(agentsSection.list) ? agentsSection.list : [];
  const models = defaults.models ?? {};
  const plugins = cfg.plugins?.entries ?? cfg.plugins?.allow ?? {};
  const channels = cfg.channels ?? {};

  return {
    path: OPENCLAW_CONFIG,
    exists: stat !== null,
    sizeBytes: stat?.size ?? 0,
    mtime: stat?.mtime?.toISOString() ?? null,
    gateway: {
      port: gateway.port,
      mode: gateway.mode,
      bind: gateway.bind,
      authMode: gateway.auth?.mode,
    },
    model: {
      primary: defaults.model?.primary,
      fallbacks: defaults.model?.fallbacks,
      catalog: Object.keys(models),
    },
    agents: {
      workspace: defaults.workspace,
      list: list.map((a) => ({ id: String(a.id ?? ""), default: Boolean(a.default) })),
    },
    plugins: Array.isArray(plugins) ? plugins.map(String) : Object.keys(plugins),
    channels: Object.keys(channels),
    raw,
    rawText,
  };
}

export function readConfig(): ConfigSummary {
  let stat: fs.Stats | null = null;
  let rawText = "";
  let raw: unknown = {};
  try {
    stat = fs.statSync(OPENCLAW_CONFIG);
    rawText = fs.readFileSync(OPENCLAW_CONFIG, "utf8");
    raw = JSON5.parse(rawText);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      rawText = "";
      raw = {};
    } else {
      throw err;
    }
  }
  return toConfigSummary(raw, rawText, stat);
}

export function validateConfigText(rawText: string): { ok: true; parsed: unknown } | { ok: false; error: string } {
  try {
    const parsed = JSON5.parse(rawText);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: "Config must be a JSON object at the root." };
    }
    return { ok: true, parsed };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export function backupConfig(reason: string): string | null {
  ensureDirs();
  if (!fs.existsSync(OPENCLAW_CONFIG)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeReason = reason.replace(/[^a-z0-9-]+/gi, "_");
  const target = path.join(MANAGER_CONFIG_BACKUP_DIR, `openclaw.${stamp}.${safeReason}.json`);
  fs.copyFileSync(OPENCLAW_CONFIG, target);
  return target;
}

export function saveConfig(payload: SavePayload): { backup: string | null; summary: ConfigSummary } {
  const validation = validateConfigText(payload.rawText);
  if (!validation.ok) {
    const err = new Error(`Invalid config: ${validation.error}`);
    (err as any).status = 400;
    throw err;
  }
  ensureDirs();
  fs.mkdirSync(path.dirname(OPENCLAW_CONFIG), { recursive: true });
  const backup = backupConfig("pre-save");
  fs.writeFileSync(OPENCLAW_CONFIG, payload.rawText, { mode: 0o600 });
  return { backup, summary: readConfig() };
}

export function setPrimaryModel(modelRef: string): ConfigSummary {
  const summary = readConfig();
  const cfg = (summary.raw ?? {}) as Record<string, any>;
  cfg.agents = cfg.agents ?? {};
  cfg.agents.defaults = cfg.agents.defaults ?? {};
  cfg.agents.defaults.model = cfg.agents.defaults.model ?? {};
  cfg.agents.defaults.model.primary = modelRef;
  cfg.agents.defaults.models = cfg.agents.defaults.models ?? {};
  if (!cfg.agents.defaults.models[modelRef]) {
    cfg.agents.defaults.models[modelRef] = {};
  }
  const rawText = JSON.stringify(cfg, null, 2) + "\n";
  saveConfig({ rawText });
  return readConfig();
}

export function upsertAgent(agent: { id: string; default?: boolean; skills?: string[]; workspace?: string }): ConfigSummary {
  if (!agent.id || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(agent.id)) {
    const err = new Error("agent id must match [a-zA-Z0-9][a-zA-Z0-9_-]*");
    (err as any).status = 400;
    throw err;
  }
  const summary = readConfig();
  const cfg = (summary.raw ?? {}) as Record<string, any>;
  cfg.agents = cfg.agents ?? {};
  const list: any[] = Array.isArray(cfg.agents.list) ? cfg.agents.list : [];
  const existingIndex = list.findIndex((a) => a && a.id === agent.id);
  const record: Record<string, any> = { id: agent.id };
  if (agent.default) record.default = true;
  if (Array.isArray(agent.skills)) record.skills = agent.skills;
  if (agent.workspace) record.workspace = agent.workspace;
  if (existingIndex >= 0) {
    list[existingIndex] = { ...list[existingIndex], ...record };
  } else {
    list.push(record);
  }
  if (agent.default) {
    for (const a of list) {
      if (a && a.id !== agent.id) delete a.default;
    }
  }
  cfg.agents.list = list;
  const rawText = JSON.stringify(cfg, null, 2) + "\n";
  saveConfig({ rawText });
  return readConfig();
}

export function deleteAgent(id: string): ConfigSummary {
  const summary = readConfig();
  const cfg = (summary.raw ?? {}) as Record<string, any>;
  const list: any[] = Array.isArray(cfg.agents?.list) ? cfg.agents.list : [];
  const next = list.filter((a) => a && a.id !== id);
  if (next.length === list.length) return summary;
  cfg.agents = cfg.agents ?? {};
  cfg.agents.list = next;
  const rawText = JSON.stringify(cfg, null, 2) + "\n";
  saveConfig({ rawText });
  return readConfig();
}
