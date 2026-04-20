import { useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Banner, Card, Loading, Pill } from "../components/Chrome";

export default function SkillPanel() {
  const skills = useAsync(() => api.skills(), []);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const create = async () => {
    setBusy(true);
    setFlash(null);
    try {
      await api.createSkill({ name, description, body: body || undefined });
      setFlash({ tone: "ok", text: `Skill '${name}' created. Restart gateway to load.` });
      setName(""); setDescription(""); setBody("");
      await skills.reload();
    } catch (err) {
      setFlash({ tone: "bad", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (n: string) => {
    if (!confirm(`Remove skill '${n}'? ${n} is linked will only remove the link.`)) return;
    setBusy(true);
    try {
      await api.deleteSkill(n);
      setFlash({ tone: "ok", text: `Removed skill '${n}'.` });
      await skills.reload();
    } catch (err) {
      setFlash({ tone: "bad", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (skills.loading && !skills.data) return <Loading label="Reading skills" />;

  return (
    <div className="flex-col" style={{ gap: "1rem" }}>
      {flash && <Banner tone={flash.tone}>{flash.text}</Banner>}

      <Card title="Installed Skills" actions={<button onClick={() => skills.reload()}>↻</button>}>
        {(skills.data ?? []).length === 0 ? (
          <div className="muted">No skills yet. Scaffold one below.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Kind</th>
                <th>Description</th>
                <th style={{ width: "4rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {(skills.data ?? []).map((s) => (
                <tr key={s.name}>
                  <td className="mono">{s.name}</td>
                  <td>
                    {s.isSymlink
                      ? <Pill>link → {s.linkTarget}</Pill>
                      : s.hasBody
                        ? <Pill tone="ok">local</Pill>
                        : <Pill tone="warn">no body</Pill>}
                  </td>
                  <td className="small muted">{s.description ?? <span className="dim">—</span>}</td>
                  <td>
                    <button className="danger" disabled={busy} onClick={() => remove(s.name)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Scaffold New Skill">
        <div className="grid cols-2">
          <div className="flex-col">
            <label className="small muted">Name (letters, digits, hyphens)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="weather-lookup" />

            <label className="small muted">Description (used for auto-trigger)</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Check current weather when user asks about temperature, rain, forecast."
            />

            <button className="primary" disabled={busy || !name || !description} onClick={create}>
              {busy ? "Creating…" : "Create skill"}
            </button>
          </div>
          <div className="flex-col">
            <label className="small muted">Body (optional — default template will be used if empty)</label>
            <textarea
              rows={11}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`# My Skill\n\n## When to use\n\n## Steps\n\n1. ...`}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
