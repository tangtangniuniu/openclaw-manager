export type GatewayState = {
  status: "running" | "stopped" | "external" | "error";
  port: number;
  bind: string;
  authMode: string;
  pid: number | null;
  portOpen: boolean;
  managed: boolean;
  logPath: string;
  note: string;
};

export type ConfigSummary = {
  configPath: string;
  providerIds: string[];
  primaryModel: string;
  defaultAgentId: string;
  workspace: string;
  pluginCount: number;
  lastTouchedAt: string | null;
};

export type AgentSummary = {
  id: string;
  default: boolean;
  workspace: string;
  primaryModel: string | null;
  skills: string[];
};

export type OllamaModel = {
  name: string;
  size?: number;
  modifiedAt?: string;
};

export type BackupSummary = {
  name: string;
  createdAt: string;
  sizeBytes: number;
};

export type SkillSummary = {
  name: string;
  path: string;
};

export type DashboardState = {
  gateway: GatewayState;
  config: ConfigSummary;
  agents: AgentSummary[];
  backups: BackupSummary[];
  skills: SkillSummary[];
  ollamaModels: OllamaModel[];
};

