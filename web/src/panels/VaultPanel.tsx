import { useState } from "react";
import { api } from "../lib/api";
import { useAsync, formatBytes, formatTime } from "../lib/hooks";
import { Banner, Card, Loading, Pill } from "../components/Chrome";

export default function VaultPanel() {
  const snaps = useAsync(() => api.snapshots(), []);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const create = async () => {
    setBusy(true);
    setFlash(null);
    try {
      const s = await api.createSnapshot(note);
      setFlash({ tone: "ok", text: `Snapshot ${s.name} captured (${formatBytes(s.sizeBytes)}).` });
      setNote("");
      await snaps.reload();
    } catch (err) {
      setFlash({ tone: "bad", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const restore = async (n: string) => {
    if (!confirm(
      `Restore ${n}? Your current ~/.openclaw will be auto-backed-up first, then replaced. Gateway should be stopped.`
    )) return;
    setBusy(true);
    try {
      const r = await api.restoreSnapshot(n);
      setFlash({
        tone: "ok",
        text: `Restored ${n}. Auto pre-restore backup: ${r.autoBackup.name}.`,
      });
      await snaps.reload();
    } catch (err) {
      setFlash({ tone: "bad", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (n: string) => {
    if (!confirm(`Delete snapshot ${n}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.deleteSnapshot(n);
      setFlash({ tone: "ok", text: `Deleted ${n}.` });
      await snaps.reload();
    } catch (err) {
      setFlash({ tone: "bad", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (snaps.loading && !snaps.data) return <Loading label="Inventorying vault" />;

  const list = snaps.data ?? [];

  return (
    <div className="flex-col" style={{ gap: "1rem" }}>
      {flash && <Banner tone={flash.tone}>{flash.text}</Banner>}
      <Banner tone="warn">
        Restore will overwrite the matching files under <span className="mono">~/.openclaw</span>.
        Stop the gateway first. A fresh pre-restore backup is automatically created so you can roll back.
      </Banner>

      <Card
        title="New Snapshot"
        actions={
          <button className="primary" disabled={busy} onClick={create}>
            {busy ? "Archiving…" : "Capture snapshot"}
          </button>
        }
      >
        <label className="small muted">Note (optional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. before model swap" />
      </Card>

      <Card title="Vault" actions={<button onClick={() => snaps.reload()}>↻ Refresh</button>}>
        {list.length === 0 ? (
          <div className="muted">No snapshots yet. Capture one above.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Created</th>
                <th>Note</th>
                <th style={{ width: "10rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.name}>
                  <td className="mono small">{s.name}</td>
                  <td className="mono small">{formatBytes(s.sizeBytes)}</td>
                  <td className="mono small dim">{formatTime(s.createdAt)}</td>
                  <td className="small">
                    {s.note
                      ? (s.note.startsWith("auto-before-restore")
                         ? <Pill tone="warn">auto</Pill>
                         : <Pill>{s.note}</Pill>)
                      : <span className="dim">—</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="row" style={{ justifyContent: "flex-end", gap: "0.4rem" }}>
                      <button className="amber" disabled={busy} onClick={() => restore(s.name)}>Restore</button>
                      <button className="danger" disabled={busy} onClick={() => remove(s.name)}>×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
