import { useEffect, useMemo, useState } from "react";
import type { DashboardState } from "../shared/types";

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

  const modelOptions = useMemo(
    () => state.ollamaModels.map((item) => `ollama/${item.name}`),
    [state.ollamaModels]
  );

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
      setAction({ busy: false, error: "", note: `${note} 完成` });
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
      ? "Gateway 已启动"
      : state.gateway.status === "external"
        ? "外部 Gateway 运行中"
        : "Gateway 已停止";

  return (
    <div className="shell">
      <div className="grain" />
      <header className="hero">
        <div>
          <p className="eyebrow">OpenClaw Mission Control</p>
          <h1>把 `~/.openclaw` 从散落配置，拧成一块顺手控制台。</h1>
          <p className="lede">
            启停 gateway、切模型、造 agent、测 agent、做 skill、备份恢复。所有高频动作在一页完成。
          </p>
        </div>
        <div className={`status-pill status-${state.gateway.status}`}>{heroStatus}</div>
      </header>

      <main className="grid">
        <section className="panel panel-overview">
          <div className="panel-title">
            <span>Overview</span>
            <strong>{state.config.primaryModel || "未读取"}</strong>
          </div>
          <div className="stats">
            <Stat label="Gateway" value={state.gateway.status} />
            <Stat label="Port" value={String(state.gateway.port)} />
            <Stat label="Auth" value={state.gateway.authMode} />
            <Stat label="默认 Agent" value={state.config.defaultAgentId} />
            <Stat label="Provider" value={state.config.providerIds.join(", ") || "无"} />
            <Stat label="Plugins" value={String(state.config.pluginCount)} />
          </div>
          <p className="panel-note">{state.gateway.note}</p>
          <div className="action-row">
            <button onClick={() => runAction("启动 gateway", () => api("/api/gateway/start", { method: "POST" }).then(() => undefined))}>
              Start
            </button>
            <button onClick={() => runAction("停止 gateway", () => api("/api/gateway/stop", { method: "POST" }).then(() => undefined))}>
              Stop
            </button>
            <button onClick={() => runAction("重启 gateway", () => api("/api/gateway/restart", { method: "POST" }).then(() => undefined))}>
              Restart
            </button>
            <button className="ghost" onClick={() => runAction("创建备份", () => api("/api/backups", { method: "POST" }).then(() => undefined))}>
              Backup Now
            </button>
            <button
              className="ghost"
              onClick={() =>
                runAction("校验配置", async () => {
                  const result = await api<{ stdout: string; stderr: string }>("/api/config/validate", {
                    method: "POST"
                  });
                  setValidateResult([result.stdout, result.stderr].filter(Boolean).join("\n") || "配置校验通过。");
                })
              }
            >
              Validate
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <span>Model Forge</span>
            <strong>{state.ollamaModels.length} 个 Ollama 模型</strong>
          </div>
          <div className="list-block">
            {modelOptions.length ? (
              modelOptions.map((item) => (
                <button
                  key={item}
                  className={item === state.config.primaryModel ? "list-item active" : "list-item"}
                  onClick={() => runAction(`切换主模型到 ${item}`, () => api("/api/models/primary", { method: "POST", body: JSON.stringify({ modelRef: item }) }).then(() => undefined))}
                >
                  {item}
                </button>
              ))
            ) : (
              <div className="empty">未读到 Ollama 模型。检查 `127.0.0.1:11434`。</div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <span>Agent Lab</span>
            <strong>{state.agents.length} 个 agent</strong>
          </div>
          <div className="two-col">
            <div>
              <label>Agent ID</label>
              <input value={agentForm.id} onChange={(event) => setAgentForm({ ...agentForm, id: event.target.value })} placeholder="ops" />
              <label>Workspace</label>
              <input
                value={agentForm.workspace}
                onChange={(event) => setAgentForm({ ...agentForm, workspace: event.target.value })}
                placeholder="~/.openclaw/workspace-ops"
              />
              <label>Primary Model</label>
              <input
                value={agentForm.primaryModel}
                onChange={(event) => setAgentForm({ ...agentForm, primaryModel: event.target.value })}
                placeholder="ollama/qwen3.5:9b"
              />
              <label>Skills</label>
              <input
                value={agentForm.skills}
                onChange={(event) => setAgentForm({ ...agentForm, skills: event.target.value })}
                placeholder="github, weather"
              />
              <button
                onClick={() =>
                  runAction("创建 agent", () =>
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
                Create Agent
              </button>
            </div>
            <div className="list-block">
              {state.agents.map((agent) => (
                <div key={agent.id} className="agent-card">
                  <strong>{agent.id}</strong>
                  <span>{agent.primaryModel ?? "未设置模型"}</span>
                  <small>{agent.workspace}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <span>Agent Test</span>
            <strong>真实调用 `openclaw agent`</strong>
          </div>
          <label>Target Agent</label>
          <input value={testForm.agentId} onChange={(event) => setTestForm({ ...testForm, agentId: event.target.value })} />
          <label>Message</label>
          <textarea value={testForm.message} onChange={(event) => setTestForm({ ...testForm, message: event.target.value })} rows={5} />
          <label className="checkbox">
            <input type="checkbox" checked={testForm.local} onChange={(event) => setTestForm({ ...testForm, local: event.target.checked })} />
            用 `--local` 测试
          </label>
          <button
            onClick={() =>
              runAction("执行 agent 测试", async () => {
                const result = await api<{ stdout: string; stderr: string }>("/api/agents/test", {
                  method: "POST",
                  body: JSON.stringify(testForm)
                });
                setTestResult([result.stdout, result.stderr].filter(Boolean).join("\n"));
              })
            }
          >
            Run Test
          </button>
          <pre className="terminal">{testResult || "测试输出会显示在这里"}</pre>
        </section>

        <section className="panel">
          <div className="panel-title">
            <span>Skill Workshop</span>
            <strong>{state.skills.length} 个本地 skill</strong>
          </div>
          <label>Name</label>
          <input value={skillForm.name} onChange={(event) => setSkillForm({ ...skillForm, name: event.target.value })} placeholder="deploy-helper" />
          <label>Description</label>
          <input
            value={skillForm.description}
            onChange={(event) => setSkillForm({ ...skillForm, description: event.target.value })}
            placeholder="Deploy helper for OpenClaw projects"
          />
          <label>Prompt</label>
          <textarea value={skillForm.prompt} onChange={(event) => setSkillForm({ ...skillForm, prompt: event.target.value })} rows={7} />
          <button
            onClick={() =>
              runAction("创建 skill", () =>
                api("/api/skills", {
                  method: "POST",
                  body: JSON.stringify(skillForm)
                }).then(() => undefined)
              )
            }
          >
            Create Skill
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
            <span>Vault + Raw Config</span>
            <strong>{state.backups.length} 个备份</strong>
          </div>
          <div className="three-col">
            <div>
              <label>Raw Config</label>
              <textarea className="raw-config" value={rawConfig} onChange={(event) => setRawConfig(event.target.value)} rows={18} />
              <button onClick={() => runAction("保存原始配置", () => api("/api/config/raw", { method: "PUT", body: JSON.stringify({ raw: rawConfig }) }).then(() => undefined))}>
                Save Config
              </button>
            </div>
            <div>
              <label>Backups</label>
              <div className="list-block">
                {state.backups.map((backup) => (
                  <button
                    key={backup.name}
                    className="list-item"
                    onClick={() => runAction(`恢复 ${backup.name}`, () => api("/api/backups/restore", { method: "POST", body: JSON.stringify({ name: backup.name }) }).then(() => undefined))}
                  >
                    <span>{backup.name}</span>
                    <small>{new Date(backup.createdAt).toLocaleString()}</small>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label>Gateway Log</label>
              <pre className="terminal terminal-tall">{logs || "暂无日志"}</pre>
              <label>Config Validate Output</label>
              <pre className="terminal">{validateResult || "点击 Validate 后显示输出"}</pre>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>{action.busy ? action.note : action.note || "Ready."}</span>
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
