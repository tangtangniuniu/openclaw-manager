export interface ConfigSummary {
  path: string;
  exists: boolean;
  sizeBytes: number;
  mtime: string | null;
  gateway: { port?: number; mode?: string; bind?: string; authMode?: string };
  model: { primary?: string; fallbacks?: string[]; catalog: string[] };
  agents: { workspace?: string; list: { id: string; default?: boolean }[] };
  plugins: string[];
  channels: string[];
  raw: unknown;
  rawText: string;
}

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

export interface OllamaProbe {
  available: boolean;
  baseUrl: string;
  models: { name: string; ref: string; size?: string; modified?: string; id?: string }[];
  error?: string;
}

export interface Agent {
  id: string;
  default?: boolean;
  skills?: string[];
  workspace?: string;
}

export interface Skill {
  name: string;
  path: string;
  description?: string;
  isSymlink: boolean;
  linkTarget?: string;
  hasBody: boolean;
}

export interface Snapshot {
  name: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
  note?: string;
}

export interface Overview {
  gateway: GatewayStatus;
  config: ConfigSummary;
  ollama: { available: boolean; baseUrl: string; modelCount: number; error?: string };
  agents: Agent[];
  skills: Skill[];
  skillCount: number;
  snapshots: Snapshot[];
}

export interface AgentTestResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
  exitCode: number | null;
  command: string;
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  overview: () => request<Overview>("GET", "/overview"),
  config: () => request<ConfigSummary>("GET", "/config"),
  saveConfig: (rawText: string) => request<{ backup: string | null; summary: ConfigSummary }>("POST", "/config", { rawText }),
  validateConfig: (rawText: string) => request<{ ok: boolean; error?: string }>("POST", "/config/validate", { rawText }),
  setPrimaryModel: (modelRef: string) => request<ConfigSummary>("POST", "/config/primary-model", { modelRef }),
  upsertAgent: (agent: { id: string; default?: boolean; skills?: string[]; workspace?: string }) =>
    request<ConfigSummary>("POST", "/config/agents", agent),
  deleteAgent: (id: string) => request<ConfigSummary>("DELETE", `/config/agents/${encodeURIComponent(id)}`),

  gatewayStatus: () => request<GatewayStatus>("GET", "/gateway/status"),
  gatewayStart: () => request<{ output: string; error?: string }>("POST", "/gateway/start"),
  gatewayStop: () => request<{ output: string; error?: string }>("POST", "/gateway/stop"),
  gatewayRestart: () => request<{ output: string; error?: string }>("POST", "/gateway/restart"),
  gatewayLogs: (lines = 300) => request<{ file: string | null; content: string }>("GET", `/gateway/logs?lines=${lines}`),
  gatewayHealth: () => request<{ ok: boolean; raw: string; error?: string }>("GET", "/gateway/health"),

  ollama: () => request<OllamaProbe>("GET", "/ollama"),

  agents: () => request<Agent[]>("GET", "/agents"),
  testAgent: (args: { agentId?: string; message: string; thinking?: string; timeoutSeconds?: number }) =>
    request<AgentTestResult>("POST", "/agents/test", args),

  skills: () => request<Skill[]>("GET", "/skills"),
  createSkill: (payload: { name: string; description: string; body?: string }) =>
    request<Skill>("POST", "/skills", payload),
  deleteSkill: (name: string) => request<void>("DELETE", `/skills/${encodeURIComponent(name)}`),

  snapshots: () => request<Snapshot[]>("GET", "/snapshots"),
  createSnapshot: (note?: string) => request<Snapshot>("POST", "/snapshots", { note: note ?? "" }),
  restoreSnapshot: (name: string) => request<{ restored: string; autoBackup: Snapshot }>("POST", `/snapshots/${encodeURIComponent(name)}/restore`),
  deleteSnapshot: (name: string) => request<void>("DELETE", `/snapshots/${encodeURIComponent(name)}`),
};
