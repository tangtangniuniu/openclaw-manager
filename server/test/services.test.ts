import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Point OPENCLAW_HOME at a tmp dir before importing the services.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-test-"));
process.env.OPENCLAW_HOME = path.join(tmp, "openclaw-home");
process.env.OPENCLAW_CONFIG_PATH = path.join(process.env.OPENCLAW_HOME, "openclaw.json");
process.env.OPENCLAW_MANAGER_HOME = path.join(tmp, "manager");
fs.mkdirSync(process.env.OPENCLAW_HOME, { recursive: true });

const { readConfig, saveConfig, setPrimaryModel, upsertAgent, deleteAgent, validateConfigText } =
  await import("../src/services/config.js");
const { createSkill, listSkills, deleteSkill } = await import("../src/services/skill.js");
const { createSnapshot, listSnapshots, deleteSnapshot, restoreSnapshot } = await import("../src/services/backup.js");

test("config: read missing file yields empty shape", () => {
  const summary = readConfig();
  assert.equal(summary.exists, false);
  assert.equal(summary.sizeBytes, 0);
  assert.deepEqual(summary.agents.list, []);
});

test("config: validate catches bad JSON5", () => {
  const bad = validateConfigText("{ agents: { ");
  assert.equal(bad.ok, false);
  const ok = validateConfigText("{ gateway: { port: 18789 } }");
  assert.equal(ok.ok, true);
});

test("config: save then read round-trips", () => {
  const text = `{\n  agents: { defaults: { workspace: "~/.openclaw/workspace" } },\n  gateway: { port: 18789, mode: "local", bind: "loopback" }\n}\n`;
  const { summary } = saveConfig({ rawText: text });
  assert.equal(summary.exists, true);
  assert.equal(summary.gateway.port, 18789);
  assert.equal(summary.agents.workspace, "~/.openclaw/workspace");
});

test("config: setPrimaryModel adds catalog entry", () => {
  const updated = setPrimaryModel("ollama/qwen3.5:9b");
  assert.equal(updated.model.primary, "ollama/qwen3.5:9b");
  assert.ok(updated.model.catalog.includes("ollama/qwen3.5:9b"));
});

test("config: upsertAgent + deleteAgent", () => {
  const afterAdd = upsertAgent({ id: "ops", default: true, skills: ["github"] });
  assert.ok(afterAdd.agents.list.find((a) => a.id === "ops" && a.default));
  const afterUpdate = upsertAgent({ id: "ops", skills: ["github", "weather"] });
  const found = (afterUpdate.raw as any).agents.list.find((a: any) => a.id === "ops");
  assert.deepEqual(found.skills, ["github", "weather"]);
  const afterDel = deleteAgent("ops");
  assert.ok(!afterDel.agents.list.find((a) => a.id === "ops"));
});

test("config: bad agent id is rejected", () => {
  assert.throws(() => upsertAgent({ id: "../escape" }));
});

test("skill: create + list + delete", () => {
  const created = createSkill({ name: "test-skill", description: "used in unit tests" });
  assert.equal(created.name, "test-skill");
  const list = listSkills();
  assert.ok(list.find((s) => s.name === "test-skill" && s.hasBody));
  deleteSkill("test-skill");
  assert.ok(!listSkills().find((s) => s.name === "test-skill"));
});

test("skill: rejects bad names", () => {
  assert.throws(() => createSkill({ name: "../evil", description: "x" }));
  assert.throws(() => createSkill({ name: "valid-name", description: "" }));
});

test("backup: create + restore + delete", async () => {
  const sentinel = path.join(process.env.OPENCLAW_HOME!, "sentinel.txt");
  fs.writeFileSync(sentinel, "hello");
  const snap = await createSnapshot("test-note");
  assert.ok(fs.existsSync(snap.path));
  const list = listSnapshots();
  assert.ok(list.find((s) => s.name === snap.name));

  fs.unlinkSync(sentinel);
  assert.equal(fs.existsSync(sentinel), false);
  const r = await restoreSnapshot(snap.name);
  assert.equal(fs.existsSync(sentinel), true, "restore should recreate sentinel");
  assert.ok(r.autoBackup.name.length > 0, "auto pre-restore backup created");

  deleteSnapshot(snap.name);
  assert.ok(!listSnapshots().find((s) => s.name === snap.name));
});
