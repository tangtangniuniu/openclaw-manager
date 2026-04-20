import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

let tmpHome: string;
let getConfigSummary: typeof import("./config.js").getConfigSummary;
let createSkill: typeof import("./config.js").createSkill;
let createAgent: typeof import("./config.js").createAgent;
let getAgents: typeof import("./config.js").getAgents;

beforeAll(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-manager-"));
  process.env.OPENCLAW_MANAGER_OPENCLAW_HOME = tmpHome;
  await fs.mkdir(path.join(tmpHome, "skills"), { recursive: true });
  await fs.writeFile(
    path.join(tmpHome, "openclaw.json"),
    JSON.stringify(
      {
        meta: { lastTouchedAt: "2026-04-20T00:00:00.000Z" },
        models: { providers: { ollama: { baseUrl: "http://127.0.0.1:11434", models: [] } } },
        agents: {
          defaults: { workspace: path.join(tmpHome, "workspace"), model: { primary: "ollama/qwen3.5:9b" } },
          list: [{ id: "main", default: true }]
        },
        gateway: { port: 18789, bind: "loopback", auth: { mode: "password" } },
        plugins: { entries: { ollama: { enabled: true } } }
      },
      null,
      2
    ),
    "utf8"
  );

  ({ getConfigSummary, createSkill, createAgent, getAgents } = await import("./config.js"));
});

describe("config service", () => {
  it("reads config summary", async () => {
    const summary = await getConfigSummary();
    expect(summary.primaryModel).toBe("ollama/qwen3.5:9b");
    expect(summary.defaultAgentId).toBe("main");
    expect(summary.pluginCount).toBe(1);
  });

  it("creates skill template", async () => {
    await createSkill({
      name: "deploy helper",
      description: "Deploy assistant",
      prompt: "Use ssh carefully."
    });

    const skillPath = path.join(tmpHome, "skills", "deploy-helper", "SKILL.md");
    expect(await fs.readFile(skillPath, "utf8")).toContain("Deploy assistant");
  });

  it("creates agent entry", async () => {
    await createAgent({
      id: "ops",
      workspace: path.join(tmpHome, "workspace-ops"),
      primaryModel: "ollama/qwen3.5:9b",
      skills: ["github"]
    });

    const agents = await getAgents();
    expect(agents.map((item) => item.id)).toContain("ops");
  });
});
