import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import JSON5 from "json5";
import { configPath, openclawHome, skillsDir } from "../lib/paths.js";
import { readJson5File, readRawFile } from "../lib/json.js";
import { sanitizeName } from "../lib/utils.js";
import type { AgentSummary, ConfigSummary, SkillSummary } from "../../shared/types.js";

const execFileAsync = promisify(execFile);

type OpenClawConfig = {
  meta?: { lastTouchedAt?: string };
  models?: {
    providers?: Record<string, { baseUrl?: string; api?: string; apiKey?: string; models?: Array<Record<string, unknown>> }>;
  };
  agents?: {
    defaults?: {
      model?: { primary?: string };
      workspace?: string;
      models?: Record<string, Record<string, unknown>>;
    };
    list?: Array<{
      id: string;
      default?: boolean;
      workspace?: string;
      model?: { primary?: string };
      skills?: string[];
    }>;
  };
  gateway?: { port?: number; bind?: string; auth?: { mode?: string } };
  plugins?: { entries?: Record<string, unknown> };
};

export async function readConfig() {
  return readJson5File<OpenClawConfig>(configPath);
}

export async function readConfigRaw() {
  return readRawFile(configPath);
}

export async function writeConfigRaw(raw: string) {
  JSON5.parse(raw);
  await fs.writeFile(configPath, `${raw.trim()}\n`, "utf8");
}

export async function getConfigSummary(): Promise<ConfigSummary> {
  const config = await readConfig();
  const providers = Object.keys(config.models?.providers ?? {});
  const agents = config.agents?.list ?? [];
  const defaultAgent = agents.find((agent) => agent.default) ?? agents[0];

  return {
    configPath,
    providerIds: providers,
    primaryModel: config.agents?.defaults?.model?.primary ?? "未设置",
    defaultAgentId: defaultAgent?.id ?? "main",
    workspace: config.agents?.defaults?.workspace ?? path.join(openclawHome, "workspace"),
    pluginCount: Object.keys(config.plugins?.entries ?? {}).length,
    lastTouchedAt: config.meta?.lastTouchedAt ?? null
  };
}

export async function getAgents(): Promise<AgentSummary[]> {
  const config = await readConfig();
  const defaults = config.agents?.defaults;
  const list = config.agents?.list?.length
    ? config.agents.list
    : [
        {
          id: "main",
          default: true
        }
      ];

  return list.map((agent) => ({
    id: agent.id,
    default: Boolean(agent.default),
    workspace: agent.workspace ?? defaults?.workspace ?? path.join(openclawHome, "workspace"),
    primaryModel: agent.model?.primary ?? defaults?.model?.primary ?? null,
    skills: agent.skills ?? []
  }));
}

export async function setPrimaryModel(modelRef: string) {
  const config = await readConfig();
  config.agents ??= {};
  config.agents.defaults ??= {};
  config.agents.defaults.model ??= {};
  config.agents.defaults.models ??= {};
  config.models ??= {};
  config.models.providers ??= {};

  const [providerId, modelId] = modelRef.split("/");

  if (!providerId || !modelId) {
    throw new Error("模型格式必须为 provider/model");
  }

  config.agents.defaults.model.primary = modelRef;
  config.agents.defaults.models[modelRef] ??= {};

  if (providerId === "ollama") {
    config.models.providers.ollama ??= {
      baseUrl: "http://127.0.0.1:11434",
      apiKey: "ollama-local",
      api: "ollama",
      models: []
    };

    const models = config.models.providers.ollama.models ?? [];
    const exists = models.some((item) => item.id === modelId);

    if (!exists) {
      models.push({
        id: modelId,
        name: modelId,
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 131072,
        maxTokens: 8192
      });
    }

    config.models.providers.ollama.models = models;
  }

  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export async function createAgent(input: {
  id: string;
  workspace?: string;
  primaryModel?: string;
  skills?: string[];
}) {
  const config = await readConfig();
  config.agents ??= {};
  config.agents.list ??= [];

  if (config.agents.list.some((agent) => agent.id === input.id)) {
    throw new Error(`agent 已存在: ${input.id}`);
  }

  config.agents.list.push({
    id: input.id,
    default: false,
    workspace: input.workspace,
    model: input.primaryModel ? { primary: input.primaryModel } : undefined,
    skills: input.skills
  });

  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export async function listSkills(): Promise<SkillSummary[]> {
  await fs.mkdir(skillsDir, { recursive: true });
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      path: path.join(skillsDir, entry.name, "SKILL.md")
    }));
}

export async function createSkill(input: { name: string; description: string; prompt: string }) {
  const slug = sanitizeName(input.name);

  if (!slug) {
    throw new Error("skill 名称无效");
  }

  const dir = path.join(skillsDir, slug);
  await fs.mkdir(dir, { recursive: true });

  const body = `---
name: ${slug}
description: >
  ${input.description}
---

${input.prompt.trim()}
`;

  await fs.writeFile(path.join(dir, "SKILL.md"), body, "utf8");
}

export async function validateConfig() {
  const { stdout, stderr } = await execFileAsync("openclaw", ["config", "validate"], {
    timeout: 120000
  });

  return {
    stdout,
    stderr
  };
}
