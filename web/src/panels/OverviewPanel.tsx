import { api } from "../lib/api";
import { useAsync, useInterval, formatTime, formatBytes } from "../lib/hooks";
import { Card, Loading, Pill, Stat, StatusDot } from "../components/Chrome";

export default function OverviewPanel({ onJump }: { onJump: (tab: any) => void }) {
  const { data, error, loading, reload } = useAsync(() => api.overview(), []);
  useInterval(reload, 10_000);

  if (loading && !data) return <Loading label="Scanning station" />;
  if (error) return <div className="banner bad">Failed to load overview: {error}</div>;
  if (!data) return null;

  const gwOk = data.gateway.running;
  const modelPrimary = data.config.model.primary ?? "—";

  return (
    <div className="flex-col" style={{ gap: "1rem" }}>
      <div className="grid cols-4">
        <Card title="Gateway">
          <Stat
            label="Runtime"
            value={
              <span>
                <StatusDot status={gwOk ? "ok" : "bad"} />{" "}
                {gwOk ? "ONLINE" : "OFFLINE"}
              </span>
            }
            tone={gwOk ? "ok" : "bad"}
          />
          <div className="divider" />
          <Stat label="PID / Port" value={<span className="mono">{data.gateway.pid ?? "—"} · {data.gateway.port ?? "—"}</span>} mono />
        </Card>

        <Card title="Primary Model">
          <Stat label="Active" value={<span className="mono">{modelPrimary}</span>} mono />
          <div className="divider" />
          <Stat label="Catalog" value={`${data.config.model.catalog.length} model(s)`} />
        </Card>

        <Card title="Ollama">
          <Stat
            label="Daemon"
            value={data.ollama.available ? "REACHABLE" : "DOWN"}
            tone={data.ollama.available ? "ok" : "warn"}
          />
          <div className="divider" />
          <Stat label="Local Models" value={data.ollama.modelCount} />
        </Card>

        <Card title="Config File">
          <Stat label="Path" value={<span className="mono small">{data.config.path}</span>} />
          <div className="divider" />
          <Stat
            label="Size · Updated"
            value={<span className="mono">{formatBytes(data.config.sizeBytes)} · {formatTime(data.config.mtime)}</span>}
            mono
          />
        </Card>
      </div>

      <div className="grid cols-3">
        <Card
          title="Agents"
          actions={<button onClick={() => onJump("agent")}>Open Lab →</button>}
        >
          {data.agents.length === 0 ? (
            <div className="muted small">No explicit agents configured (using default "main").</div>
          ) : (
            <table>
              <thead>
                <tr><th>ID</th><th>Default</th></tr>
              </thead>
              <tbody>
                {data.agents.map((a) => (
                  <tr key={a.id}>
                    <td className="mono">{a.id}</td>
                    <td>{a.default ? <Pill tone="ok">default</Pill> : <span className="dim">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card
          title="Skills"
          actions={<button onClick={() => onJump("skill")}>Workshop →</button>}
        >
          {data.skills.length === 0 ? (
            <div className="muted small">No skills installed yet.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: "1rem" }}>
              {data.skills.slice(0, 6).map((s) => (
                <li key={s.name} className="small">
                  <span className="mono">{s.name}</span>{" "}
                  {s.isSymlink && <span className="kbd">link</span>}
                </li>
              ))}
              {data.skillCount > 6 && <li className="dim small">+{data.skillCount - 6} more</li>}
            </ul>
          )}
        </Card>

        <Card
          title="Snapshots"
          actions={<button onClick={() => onJump("vault")}>Vault →</button>}
        >
          {data.snapshots.length === 0 ? (
            <div className="muted small">No backups yet. Create one in Vault.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
              {data.snapshots.slice(0, 5).map((s) => (
                <li key={s.name} className="small" style={{ marginBottom: "0.35rem" }}>
                  <div className="mono" style={{ fontSize: "0.75rem" }}>{s.name}</div>
                  <div className="dim" style={{ fontSize: "0.7rem" }}>
                    {formatBytes(s.sizeBytes)} · {formatTime(s.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid cols-2">
        <Card title="Plugins">
          <div className="row">
            {data.config.plugins.length === 0
              ? <span className="muted">none</span>
              : data.config.plugins.map((p) => <Pill key={p}>{p}</Pill>)
            }
          </div>
        </Card>
        <Card title="Channels">
          <div className="row">
            {data.config.channels.length === 0
              ? <span className="muted">none</span>
              : data.config.channels.map((c) => <Pill key={c}>{c}</Pill>)
            }
          </div>
        </Card>
      </div>
    </div>
  );
}
