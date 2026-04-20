import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Banner, Card, Loading } from "../components/Chrome";

export default function ConfigPanel() {
  const cfg = useAsync(() => api.config(), []);
  const [draft, setDraft] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [validation, setValidation] = useState<{ ok: boolean; error?: string } | null>(null);
  const [flash, setFlash] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cfg.data && !dirty) {
      setDraft(cfg.data.rawText || "{\n}\n");
    }
  }, [cfg.data, dirty]);

  const validate = async () => {
    const r = await api.validateConfig(draft);
    setValidation(r);
  };

  const save = async () => {
    setBusy(true);
    setFlash(null);
    try {
      const r = await api.saveConfig(draft);
      setFlash({
        tone: "ok",
        text: r.backup
          ? `Saved. Pre-save backup: ${r.backup.split("/").pop()}.`
          : "Saved (no backup — file did not exist).",
      });
      setDirty(false);
      setValidation({ ok: true });
      await cfg.reload();
    } catch (err) {
      setFlash({ tone: "bad", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (cfg.loading && !cfg.data) return <Loading label="Reading config" />;

  return (
    <div className="flex-col" style={{ gap: "1rem" }}>
      <Banner tone="warn">
        Direct edit of <span className="mono">~/.openclaw/openclaw.json</span>. A timestamped backup is saved in{" "}
        <span className="mono">~/.openclaw-manager/backups/config/</span> before every save. Invalid JSON5 is rejected.
      </Banner>
      {flash && <Banner tone={flash.tone}>{flash.text}</Banner>}
      {validation && !validation.ok && (
        <Banner tone="bad">Parse error: {validation.error}</Banner>
      )}
      {validation && validation.ok && !flash && (
        <Banner tone="ok">JSON5 parses cleanly.</Banner>
      )}

      <Card
        title={`Raw config (${cfg.data?.path})`}
        actions={
          <>
            <button onClick={validate} disabled={!draft.trim()}>Validate</button>
            <button
              onClick={() => {
                setDraft(cfg.data?.rawText ?? "");
                setDirty(false);
                setValidation(null);
                setFlash(null);
              }}
              disabled={!dirty}
            >
              Revert
            </button>
            <button className="primary" disabled={busy || !dirty} onClick={save}>
              {busy ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <textarea
          rows={28}
          spellCheck={false}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setDirty(true);
            setValidation(null);
          }}
        />
      </Card>
    </div>
  );
}
