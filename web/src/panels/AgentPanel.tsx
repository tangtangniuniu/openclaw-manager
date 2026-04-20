import { useState } from "react";
import { api, AgentTestResult } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Banner, Card, Loading, Pill } from "../components/Chrome";

export default function AgentPanel() {
  const agents = useAsync(() => api.agents(), []);
  const [newAgentId, setNewAgentId] = useState("");
  const [newAgentDefault, setNewAgentDefault] = useState(false);
  const [newAgentSkills, setNewAgentSkills] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const [testAgentId, setTestAgentId] = useState<string>("");
  const [testMessage, setTestMessage] = useState("Hello, agent. Respond with a single word.");
  const [testThinking, setTestThinking] = useState<string>("off");
  const [testTimeout, setTestTimeout] = useState(90);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<AgentTestResult | null>(null);

  if (agents.loading && !agents.data) return <Loading label="Reading agents" />;

  const list = agents.data ?? [];
  const createAgent = async () => {
    if (!newAgentId) return;
    setBusy(true);
    setFlash(null);
    try {
      await api.upsertAgent({
        id: newAgentId,
        default: newAgentDefault,
        skills: newAgentSkills
          ? newAgentSkills.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      });
      setNewAgentId("");
      setNewAgentSkills("");
      setNewAgentDefault(false);
      setFlash({ tone: "ok", text: `Saved agent '${newAgentId}' to config. Restart gateway to load.` });
      await agents.reload();
    } catch (err) {
      setFlash({ tone: "bad", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const removeAgent = async (id: string) => {
    if (!confirm(`Remove agent ${id} from config?`)) return;
    setBusy(true);
    try {
      await api.deleteAgent(id);
      setFlash({ tone: "ok", text: `Removed agent '${id}' from config.` });
      await agents.reload();
    } catch (err) {
      setFlash({ tone: "bad", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testAgent({
        agentId: testAgentId || undefined,
        message: testMessage,
        thinking: testThinking,
        timeoutSeconds: testTimeout,
      });
      setTestResult(res);
    } catch (err) {
      setTestResult({
        ok: false,
        stdout: "",
        stderr: (err as Error).message,
        durationMs: 0,
        exitCode: null,
        command: "",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex-col" style={{ gap: "1rem" }}>
      {flash && <Banner tone={flash.tone}>{flash.text}</Banner>}

      <Card title="Agents in config">
        {list.length === 0 ? (
          <div className="muted">No explicit agents — OpenClaw uses default 'main'.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Default</th>
                <th>Skills</th>
                <th>Workspace</th>
                <th style={{ width: "4rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.id}</td>
                  <td>{a.default ? <Pill tone="ok">default</Pill> : <span className="dim">—</span>}</td>
                  <td className="mono small">
                    {a.skills && a.skills.length ? a.skills.join(", ") : <span className="dim">inherit</span>}
                  </td>
                  <td className="mono small dim">{a.workspace ?? "—"}</td>
                  <td>
                    <button className="danger" disabled={busy} onClick={() => removeAgent(a.id)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="grid cols-2">
        <Card title="New Agent">
          <div className="flex-col">
            <label className="small muted">ID (a-z, 0-9, -_)</label>
            <input value={newAgentId} onChange={(e) => setNewAgentId(e.target.value)} placeholder="ops" />

            <label className="small muted">Skills (comma separated, optional)</label>
            <input value={newAgentSkills} onChange={(e) => setNewAgentSkills(e.target.value)} placeholder="github, weather" />

            <label className="flex-row" style={{ gap: "0.5rem", alignItems: "center", marginTop: "0.4rem" }}>
              <input
                type="checkbox"
                checked={newAgentDefault}
                onChange={(e) => setNewAgentDefault(e.target.checked)}
                style={{ width: "auto" }}
              />
              <span className="small muted">Make this the default agent</span>
            </label>

            <button className="primary" disabled={busy || !newAgentId} onClick={createAgent}>
              {busy ? "Saving…" : "Save agent"}
            </button>
          </div>
        </Card>

        <Card title="Test Dispatch">
          <div className="flex-col">
            <label className="small muted">Agent</label>
            <select value={testAgentId} onChange={(e) => setTestAgentId(e.target.value)}>
              <option value="">(auto / main)</option>
              {list.map((a) => <option key={a.id} value={a.id}>{a.id}</option>)}
            </select>

            <label className="small muted">Message</label>
            <textarea rows={3} value={testMessage} onChange={(e) => setTestMessage(e.target.value)} />

            <div className="flex-row" style={{ gap: "0.6rem" }}>
              <div className="flex-1">
                <label className="small muted">Thinking</label>
                <select value={testThinking} onChange={(e) => setTestThinking(e.target.value)}>
                  {["off", "minimal", "low", "medium", "high", "xhigh"].map((v) =>
                    <option key={v} value={v}>{v}</option>
                  )}
                </select>
              </div>
              <div className="flex-1">
                <label className="small muted">Timeout (s)</label>
                <input
                  type="number"
                  min={15}
                  max={600}
                  value={testTimeout}
                  onChange={(e) => setTestTimeout(Number(e.target.value) || 90)}
                />
              </div>
            </div>

            <button className="primary" onClick={runTest} disabled={testing || !testMessage.trim()}>
              {testing ? "Dispatching…" : "Send test"}
            </button>
          </div>
        </Card>
      </div>

      {testResult && (
        <Card title={`Result ${testResult.ok ? "(ok)" : "(failed)"} · ${testResult.durationMs}ms · exit=${testResult.exitCode ?? "—"}`}>
          <div className="small muted mono" style={{ marginBottom: "0.4rem" }}>{testResult.command}</div>
          {testResult.stdout && (
            <>
              <div className="stat-label" style={{ marginTop: "0.2rem" }}>stdout</div>
              <pre className="log-pane">{testResult.stdout}</pre>
            </>
          )}
          {testResult.stderr && (
            <>
              <div className="stat-label" style={{ marginTop: "0.6rem" }}>stderr</div>
              <pre className="log-pane">{testResult.stderr}</pre>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
