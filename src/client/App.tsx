import { useEffect, useMemo, useState } from "react";
import type { DashboardState } from "../shared/types";

type Locale = "zh" | "en";

type ActionState = {
  busy: boolean;
  error: string;
  note: string;
};

const emptyState: DashboardState = {
  gateway: {
    status: "stopped",
    port: 18789,
    bind: "loopback",
    authMode: "unknown",
    pid: null,
    portOpen: false,
    managed: false,
    logPath: "",
    note: ""
  },
  config: {
    configPath: "",
    providerIds: [],
    primaryModel: "",
    defaultAgentId: "",
    workspace: "",
    pluginCount: 0,
    lastTouchedAt: null
  },
  agents: [],
  backups: [],
  skills: [],
  ollamaModels: []
};

const copy = {
  zh: {
    mission: "OpenClaw 控制舱",
    heroTitle: "把 `~/.openclaw` 从散落配置，拧成一块顺手控制台。",
    heroBody: "启停 gateway、切模型、造 agent、测 agent、做 skill、备份恢复。所有高频动作在一页完成。",
    statusRunning: "Gateway 已启动",
    statusExternal: "外部 Gateway 运行中",
    statusStopped: "Gateway 已停止",
    overview: "总览",
    notLoaded: "未读取",
    gateway: "Gateway",
    port: "端口",
    auth: "鉴权",
    defaultAgent: "默认 Agent",
    provider: "提供方",
    none: "无",
    plugins: "插件",
    start: "启动",
    stop: "停止",
    restart: "重启",
    backupNow: "立即备份",
    validate: "校验配置",
    validatePassed: "配置校验通过。",
    modelForge: "模型工坊",
    ollamaModels: "个 Ollama 模型",
    noOllama: "未读到 Ollama 模型。检查 `127.0.0.1:11434`。",
    switchModel: "切换主模型到",
    agentLab: "Agent 实验台",
    agents: "个 agent",
    agentId: "Agent ID",
    workspace: "工作区",
    primaryModel: "主模型",
    skills: "Skills",
    createAgent: "创建 Agent",
    noModel: "未设置模型",
    agentTest: "Agent 测试",
    realAgentTest: "真实调用 `openclaw agent`",
    targetAgent: "目标 Agent",
    message: "消息",
    localTest: "用 `--local` 测试",
    runTest: "运行测试",
    testOutputPlaceholder: "测试输出会显示在这里",
    skillWorkshop: "Skill 工坊",
    localSkills: "个本地 skill",
    name: "名称",
    description: "描述",
    prompt: "提示词",
    createSkill: "创建 Skill",
    vault: "仓库 + 原始配置",
    backups: "个备份",
    rawConfig: "原始配置",
    saveConfig: "保存配置",
    gatewayLog: "Gateway 日志",
    noLogs: "暂无日志",
    validateOutput: "配置校验输出",
    validateOutputPlaceholder: "点击 校验配置 后显示输出",
    ready: "就绪。",
    done: "完成",
    actionStartGateway: "启动 gateway",
    actionStopGateway: "停止 gateway",
    actionRestartGateway: "重启 gateway",
    actionCreateBackup: "创建备份",
    actionValidateConfig: "校验配置",
    actionCreateAgent: "创建 agent",
    actionRunAgentTest: "执行 agent 测试",
    actionCreateSkill: "创建 skill",
    actionSaveConfig: "保存原始配置",
    actionRestore: "恢复",
    langLabel: "语言",
    english: "English",
    chinese: "中文"
  },
  en: {
    mission: "OpenClaw Mission Control",
    heroTitle: "Turn `~/.openclaw` from scattered config into one usable control desk.",
    heroBody: "Start and stop gateway, switch models, create agents, test agents, build skills, and back up or restore. High-frequency actions stay on one page.",
    statusRunning: "Gateway running",
    statusExternal: "External gateway active",
    statusStopped: "Gateway stopped",
    overview: "Overview",
    notLoaded: "Not loaded",
    gateway: "Gateway",
    port: "Port",
    auth: "Auth",
    defaultAgent: "Default Agent",
    provider: "Provider",
    none: "None",
    plugins: "Plugins",
    start: "Start",
    stop: "Stop",
    restart: "Restart",
    backupNow: "Backup Now",
    validate: "Validate",
    validatePassed: "Config validation passed.",
    modelForge: "Model Forge",
    ollamaModels: "Ollama models",
    noOllama: "No Ollama models found. Check `127.0.0.1:11434`.",
    switchModel: "Switch primary model to",
    agentLab: "Agent Lab",
    agents: "agents",
    agentId: "Agent ID",
    workspace: "Workspace",
    primaryModel: "Primary Model",
    skills: "Skills",
    createAgent: "Create Agent",
    noModel: "No model set",
    agentTest: "Agent Test",
    realAgentTest: "Real `openclaw agent` execution",
    targetAgent: "Target Agent",
    message: "Message",
    localTest: "Test with `--local`",
    runTest: "Run Test",
    testOutputPlaceholder: "Test output appears here",
    skillWorkshop: "Skill Workshop",
    localSkills: "local skills",
    name: "Name",
    description: "Description",
    prompt: "Prompt",
    createSkill: "Create Skill",
    vault: "Vault + Raw Config",
    backups: "backups",
    rawConfig: "Raw Config",
    saveConfig: "Save Config",
    gatewayLog: "Gateway Log",
    noLogs: "No logs yet",
    validateOutput: "Config Validate Output",
    validateOutputPlaceholder: "Click Validate to see output",
    ready: "Ready.",
    done: "done",
    actionStartGateway: "Start gateway",
    actionStopGateway: "Stop gateway",
    actionRestartGateway: "Restart gateway",
    actionCreateBackup: "Create backup",
    actionValidateConfig: "Validate config",
    actionCreateAgent: "Create agent",
    actionRunAgentTest: "Run agent test",
    actionCreateSkill: "Create skill",
    actionSaveConfig: "Save raw config",
    actionRestore: "Restore",
    langLabel: "Language",
    english: "English",
    chinese: "中文"
  }
} as const;

async function api<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "request failed");
  }

  return payload as T;
}

export function App() {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem("openclaw-manager-locale");
    return saved === "en" ? "en" : "zh";
  });
  const [state, setState] = useState<DashboardState>(emptyState);
  const [logs, setLogs] = useState("");
  const [rawConfig, setRawConfig] = useState("");
  const [action, setAction] = useState<ActionState>({ busy: false, error: "", note: "" });
  const [agentForm, setAgentForm] = useState({ id: "", workspace: "", primaryModel: "", skills: "" });
  const [skillForm, setSkillForm] = useState({
    name: "",
    description: "",
    prompt: "Respond with direct, technical help.\nUse local tools before guessing."
  });
  const [testForm, setTestForm] = useState({
    agentId: "",
    message: "给我总结当前 OpenClaw 配置状态",
    local: false
  });
  const [testResult, setTestResult] = useState("");
  const [validateResult, setValidateResult] = useState("");
  const t = copy[locale];

  const modelOptions = useMemo(
    () => state.ollamaModels.map((item) => `ollama/${item.name}`),
    [state.ollamaModels]
  );

  useEffect(() => {
    localStorage.setItem("openclaw-manager-locale", locale);
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  async function refresh() {
    const [dashboard, config, logPayload] = await Promise.all([
      api<DashboardState>("/api/dashboard"),
      api<{ raw: string }>("/api/config/raw"),
      api<{ text: string }>("/api/gateway/logs")
    ]);

    setState(dashboard);
    setRawConfig(config.raw);
    setLogs(logPayload.text);
    setTestForm((current) => ({
      ...current,
      agentId: current.agentId || dashboard.config.defaultAgentId
    }));
    setAgentForm((current) => ({
      ...current,
      primaryModel: current.primaryModel || dashboard.config.primaryModel
    }));
  }

  useEffect(() => {
    refresh().catch((error: Error) => {
      setAction({ busy: false, error: error.message, note: "" });
    });
  }, []);

  async function runAction(note: string, fn: () => Promise<void>) {
    setAction({ busy: true, error: "", note });

    try {
      await fn();
      await refresh();
      setAction({ busy: false, error: "", note: `${note} ${t.done}` });
    } catch (error) {
      setAction({
        busy: false,
        error: error instanceof Error ? error.message : "unknown error",
        note
      });
    }
  }

  const heroStatus =
    state.gateway.status === "running"
      ? t.statusRunning
      : state.gateway.status === "external"
        ? t.statusExternal
        : t.statusStopped;

  return (
    <div className="shell">
      <div className="grain" />
      <header className="hero">
        <div>
          <p className="eyebrow">{t.mission}</p>
          <h1>{t.heroTitle}</h1>
          <p className="lede">{t.heroBody}</p>
        </div>
        <div className="hero-controls">
          <div className="lang-switch" aria-label={t.langLabel}>
            <button
              type="button"
              className={locale === "zh" ? "lang-button active" : "lang-button"}
              onClick={() => setLocale("zh")}
            >
              {t.chinese}
            </button>
            <button
              type="button"
              className={locale === "en" ? "lang-button active" : "lang-button"}
              onClick={() => setLocale("en")}
            >
              {t.english}
            </button>
          </div>
          <div className={`status-pill status-${state.gateway.status}`}>{heroStatus}</div>
        </div>
      </header>

      <main className="grid">
        <section className="panel panel-overview">
          <div className="panel-title">
            <span>{t.overview}</span>
            <strong>{state.config.primaryModel || t.notLoaded}</strong>
          </div>
          <div className="stats">
            <Stat label={t.gateway} value={state.gateway.status} />
            <Stat label={t.port} value={String(state.gateway.port)} />
            <Stat label={t.auth} value={state.gateway.authMode} />
            <Stat label={t.defaultAgent} value={state.config.defaultAgentId} />
            <Stat label={t.provider} value={state.config.providerIds.join(", ") || t.none} />
            <Stat label={t.plugins} value={String(state.config.pluginCount)} />
          </div>
          <p className="panel-note">{state.gateway.note}</p>
          <div className="action-row">
            <button onClick={() => runAction(t.actionStartGateway, () => api("/api/gateway/start", { method: "POST" }).then(() => undefined))}>
              {t.start}
            </button>
            <button onClick={() => runAction(t.actionStopGateway, () => api("/api/gateway/stop", { method: "POST" }).then(() => undefined))}>
              {t.stop}
            </button>
            <button onClick={() => runAction(t.actionRestartGateway, () => api("/api/gateway/restart", { method: "POST" }).then(() => undefined))}>
              {t.restart}
            </button>
            <button className="ghost" onClick={() => runAction(t.actionCreateBackup, () => api("/api/backups", { method: "POST" }).then(() => undefined))}>
              {t.backupNow}
            </button>
            <button
              className="ghost"
              onClick={() =>
                runAction(t.actionValidateConfig, async () => {
                  const result = await api<{ stdout: string; stderr: string }>("/api/config/validate", {
                    method: "POST"
                  });
                  setValidateResult([result.stdout, result.stderr].filter(Boolean).join("\n") || t.validatePassed);
                })
              }
            >
              {t.validate}
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <span>{t.modelForge}</span>
            <strong>{state.ollamaModels.length} {t.ollamaModels}</strong>
          </div>
          <div className="list-block">
            {modelOptions.length ? (
              modelOptions.map((item) => (
                <button
                  key={item}
                  className={item === state.config.primaryModel ? "list-item active" : "list-item"}
                  onClick={() => runAction(`${t.switchModel} ${item}`, () => api("/api/models/primary", { method: "POST", body: JSON.stringify({ modelRef: item }) }).then(() => undefined))}
                >
                  {item}
                </button>
              ))
            ) : (
              <div className="empty">{t.noOllama}</div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <span>{t.agentLab}</span>
            <strong>{state.agents.length} {t.agents}</strong>
          </div>
          <div className="two-col">
            <div>
              <label>{t.agentId}</label>
              <input value={agentForm.id} onChange={(event) => setAgentForm({ ...agentForm, id: event.target.value })} placeholder="ops" />
              <label>{t.workspace}</label>
              <input
                value={agentForm.workspace}
                onChange={(event) => setAgentForm({ ...agentForm, workspace: event.target.value })}
                placeholder="~/.openclaw/workspace-ops"
              />
              <label>{t.primaryModel}</label>
              <input
                value={agentForm.primaryModel}
                onChange={(event) => setAgentForm({ ...agentForm, primaryModel: event.target.value })}
                placeholder="ollama/qwen3.5:9b"
              />
              <label>{t.skills}</label>
              <input
                value={agentForm.skills}
                onChange={(event) => setAgentForm({ ...agentForm, skills: event.target.value })}
                placeholder="github, weather"
              />
              <button
                onClick={() =>
                  runAction(t.actionCreateAgent, () =>
                    api("/api/agents", {
                      method: "POST",
                      body: JSON.stringify({
                        id: agentForm.id,
                        workspace: agentForm.workspace || undefined,
                        primaryModel: agentForm.primaryModel || undefined,
                        skills: agentForm.skills
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean)
                      })
                    }).then(() => undefined)
                  )
                }
              >
                {t.createAgent}
              </button>
            </div>
            <div className="list-block">
              {state.agents.map((agent) => (
                <div key={agent.id} className="agent-card">
                  <strong>{agent.id}</strong>
                  <span>{agent.primaryModel ?? t.noModel}</span>
                  <small>{agent.workspace}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <span>{t.agentTest}</span>
            <strong>{t.realAgentTest}</strong>
          </div>
          <label>{t.targetAgent}</label>
          <input value={testForm.agentId} onChange={(event) => setTestForm({ ...testForm, agentId: event.target.value })} />
          <label>{t.message}</label>
          <textarea value={testForm.message} onChange={(event) => setTestForm({ ...testForm, message: event.target.value })} rows={5} />
          <label className="checkbox">
            <input type="checkbox" checked={testForm.local} onChange={(event) => setTestForm({ ...testForm, local: event.target.checked })} />
            {t.localTest}
          </label>
          <button
            onClick={() =>
              runAction(t.actionRunAgentTest, async () => {
                const result = await api<{ stdout: string; stderr: string }>("/api/agents/test", {
                  method: "POST",
                  body: JSON.stringify(testForm)
                });
                setTestResult([result.stdout, result.stderr].filter(Boolean).join("\n"));
              })
            }
          >
            {t.runTest}
          </button>
          <pre className="terminal">{testResult || t.testOutputPlaceholder}</pre>
        </section>

        <section className="panel">
          <div className="panel-title">
            <span>{t.skillWorkshop}</span>
            <strong>{state.skills.length} {t.localSkills}</strong>
          </div>
          <label>{t.name}</label>
          <input value={skillForm.name} onChange={(event) => setSkillForm({ ...skillForm, name: event.target.value })} placeholder="deploy-helper" />
          <label>{t.description}</label>
          <input
            value={skillForm.description}
            onChange={(event) => setSkillForm({ ...skillForm, description: event.target.value })}
            placeholder="Deploy helper for OpenClaw projects"
          />
          <label>{t.prompt}</label>
          <textarea value={skillForm.prompt} onChange={(event) => setSkillForm({ ...skillForm, prompt: event.target.value })} rows={7} />
          <button
            onClick={() =>
              runAction(t.actionCreateSkill, () =>
                api("/api/skills", {
                  method: "POST",
                  body: JSON.stringify(skillForm)
                }).then(() => undefined)
              )
            }
          >
            {t.createSkill}
          </button>
          <div className="list-block">
            {state.skills.map((skill) => (
              <div key={skill.name} className="skill-row">
                <strong>{skill.name}</strong>
                <small>{skill.path}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="panel panel-wide">
          <div className="panel-title">
            <span>{t.vault}</span>
            <strong>{state.backups.length} {t.backups}</strong>
          </div>
          <div className="three-col">
            <div>
              <label>{t.rawConfig}</label>
              <textarea className="raw-config" value={rawConfig} onChange={(event) => setRawConfig(event.target.value)} rows={18} />
              <button onClick={() => runAction(t.actionSaveConfig, () => api("/api/config/raw", { method: "PUT", body: JSON.stringify({ raw: rawConfig }) }).then(() => undefined))}>
                {t.saveConfig}
              </button>
            </div>
            <div>
              <label>{t.backups}</label>
              <div className="list-block">
                {state.backups.map((backup) => (
                  <button
                    key={backup.name}
                    className="list-item"
                    onClick={() => runAction(`${t.actionRestore} ${backup.name}`, () => api("/api/backups/restore", { method: "POST", body: JSON.stringify({ name: backup.name }) }).then(() => undefined))}
                  >
                    <span>{backup.name}</span>
                    <small>{new Date(backup.createdAt).toLocaleString()}</small>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label>{t.gatewayLog}</label>
              <pre className="terminal terminal-tall">{logs || t.noLogs}</pre>
              <label>{t.validateOutput}</label>
              <pre className="terminal">{validateResult || t.validateOutputPlaceholder}</pre>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>{action.busy ? action.note : action.note || t.ready}</span>
        <span className="error">{action.error}</span>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
