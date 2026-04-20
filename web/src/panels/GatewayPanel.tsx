import { useCallback, useState } from "react";
import { api } from "../lib/api";
import { useAsync, useInterval } from "../lib/hooks";
import { Banner, Card, Loading, Pill, Stat, StatusDot } from "../components/Chrome";

export default function GatewayPanel() {
  const status = useAsync(() => api.gatewayStatus(), []);
  const logs = useAsync(() => api.gatewayLogs(400), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  useInterval(() => status.reload(), 5000);
  useInterval(() => logs.reload(), 6000);

  const run = useCallback(
    async (action: "start" | "stop" | "restart") => {
      setBusy(action);
      setFlash(null);
      try {
        const res = await api[`gateway${action.charAt(0).toUpperCase()}${action.slice(1)}` as "gatewayStart" | "gatewayStop" | "gatewayRestart"]();
        setFlash({ tone: res.error ? "bad" : "ok", text: res.output || `${action} dispatched.` });
        await status.reload();
        await logs.reload();
      } catch (err) {
        setFlash({ tone: "bad", text: (err as Error).message });
      } finally {
        setBusy(null);
      }
    },
    [status, logs]
  );

  if (status.loading && !status.data) return <Loading label="Probing gateway" />;

  const s = status.data;
  const running = s?.running ?? false;

  return (
    <div className="flex-col" style={{ gap: "1rem" }}>
      {flash && <Banner tone={flash.tone}>{flash.text}</Banner>}
      {status.error && <Banner tone="bad">{status.error}</Banner>}

      <Card
        title="Runtime"
        actions={
          <>
            <button className="primary" disabled={busy !== null || running} onClick={() => run("start")}>
              {busy === "start" ? "…" : "Start"}
            </button>
            <button className="amber" disabled={busy !== null || !running} onClick={() => run("restart")}>
              {busy === "restart" ? "…" : "Restart"}
            </button>
            <button className="danger" disabled={busy !== null || !running} onClick={() => run("stop")}>
              {busy === "stop" ? "…" : "Stop"}
            </button>
          </>
        }
      >
        <div className="grid cols-4" style={{ gap: "0.8rem" }}>
          <Stat
            label="Status"
            value={
              <span>
                <StatusDot status={running ? "ok" : "bad"} />{" "}
                {running ? "ONLINE" : "OFFLINE"}
              </span>
            }
            tone={running ? "ok" : "bad"}
          />
          <Stat label="PID" value={<span className="mono">{s?.pid ?? "—"}</span>} mono />
          <Stat label="Port" value={<span className="mono">{s?.port ?? "—"}</span>} mono />
          <Stat label="Bind" value={<span className="mono">{s?.bind ?? "—"}</span>} mono />
        </div>
        <div className="divider" />
        <div className="row">
          {s?.service && <Pill>svc: {s.service.trim()}</Pill>}
          {s?.mode && <Pill>mode: {s.mode}</Pill>}
          {s?.dashboard && (
            <Pill>
              dash: <a href={s.dashboard} target="_blank" rel="noreferrer">{s.dashboard}</a>
            </Pill>
          )}
        </div>
      </Card>

      <Card
        title="Log Tail"
        actions={
          <button onClick={() => logs.reload()} disabled={logs.loading}>
            ↻ Refresh
          </button>
        }
      >
        <div className="small muted" style={{ marginBottom: "0.4rem" }}>
          {logs.data?.file ? <span className="mono">{logs.data.file}</span> : "no logs yet"}
        </div>
        <pre className="log-pane tall">{logs.data?.content || "// waiting for log output //"}</pre>
      </Card>

      <Card title="Raw status output">
        <pre className="log-pane">{s?.raw || "(empty)"}</pre>
      </Card>
    </div>
  );
}
