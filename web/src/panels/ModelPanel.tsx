import { useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Banner, Card, Loading, Pill, Stat } from "../components/Chrome";

export default function ModelPanel() {
  const cfg = useAsync(() => api.config(), []);
  const ollama = useAsync(() => api.ollama(), []);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [selection, setSelection] = useState<string>("");

  if (cfg.loading && !cfg.data) return <Loading label="Reading config" />;

  const primary = cfg.data?.model.primary ?? "(none)";
  const catalog = cfg.data?.model.catalog ?? [];
  const models = ollama.data?.models ?? [];

  const apply = async (ref: string) => {
    if (!ref) return;
    setBusy(true);
    setFlash(null);
    try {
      await api.setPrimaryModel(ref);
      setFlash({ tone: "ok", text: `Primary model switched to ${ref}. Restart gateway to apply.` });
      await cfg.reload();
    } catch (err) {
      setFlash({ tone: "bad", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-col" style={{ gap: "1rem" }}>
      {flash && <Banner tone={flash.tone}>{flash.text}</Banner>}

      <div className="grid cols-3">
        <Card title="Primary">
          <Stat label="Active" value={<span className="mono">{primary}</span>} mono />
          <div className="divider" />
          <div className="row small muted">
            Fallbacks:{" "}
            {cfg.data?.model.fallbacks?.length
              ? cfg.data!.model.fallbacks!.map((f) => <Pill key={f}>{f}</Pill>)
              : <span className="dim">none</span>}
          </div>
        </Card>
        <Card title="Catalog">
          <Stat label="Known models" value={catalog.length} />
          <div className="divider" />
          <div className="row">
            {catalog.length === 0
              ? <span className="muted">empty</span>
              : catalog.slice(0, 12).map((m) => <Pill key={m}>{m}</Pill>)
            }
          </div>
        </Card>
        <Card title="Ollama Probe">
          <Stat
            label="Status"
            value={ollama.data?.available ? "REACHABLE" : "UNREACHABLE"}
            tone={ollama.data?.available ? "ok" : "warn"}
          />
          <div className="divider" />
          <div className="small mono dim">{ollama.data?.baseUrl}</div>
          {ollama.error && <div className="small" style={{ color: "var(--accent-red)" }}>{ollama.error}</div>}
        </Card>
      </div>

      <Card
        title="Local Ollama Models"
        actions={
          <>
            <button onClick={() => ollama.reload()} disabled={ollama.loading}>↻ Rescan</button>
            <button
              className="primary"
              disabled={busy || !selection}
              onClick={() => apply(selection)}
            >
              {busy ? "Applying…" : "Set as primary"}
            </button>
          </>
        }
      >
        {ollama.loading && !ollama.data ? (
          <div className="loading">Rescanning</div>
        ) : models.length === 0 ? (
          <div className="muted">
            No local Ollama models detected. Pull one with{" "}
            <span className="mono">ollama pull qwen3.5:9b</span>.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: "2rem" }} />
                <th>Model</th>
                <th>Size</th>
                <th>Modified</th>
                <th>Ref</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.name} onClick={() => setSelection(m.ref)} style={{ cursor: "pointer" }}>
                  <td>
                    <input
                      type="radio"
                      name="model"
                      checked={selection === m.ref}
                      onChange={() => setSelection(m.ref)}
                      style={{ width: "auto" }}
                    />
                  </td>
                  <td className="mono">{m.name}{m.ref === primary ? <>  <Pill tone="ok">active</Pill></> : null}</td>
                  <td className="mono small dim">{m.size ?? "—"}</td>
                  <td className="mono small dim">{m.modified ? new Date(m.modified).toLocaleString() : "—"}</td>
                  <td className="mono small">{m.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
