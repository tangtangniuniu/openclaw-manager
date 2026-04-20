import express from "express";
import cors from "cors";
import { createBackup, listBackups, restoreBackup } from "./services/backup.js";
import { runAgentTest } from "./services/agent.js";
import {
  createAgent,
  createSkill,
  getAgents,
  getConfigSummary,
  listSkills,
  readConfigRaw,
  setPrimaryModel,
  validateConfig,
  writeConfigRaw
} from "./services/config.js";
import { getGatewayState, readGatewayLog, restartGateway, startGateway, stopGateway } from "./services/gateway.js";
import { listOllamaModels } from "./services/ollama.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/dashboard", async (_req, res) => {
    try {
      const [gateway, config, agents, backups, skills, ollamaModels] = await Promise.all([
        getGatewayState(),
        getConfigSummary(),
        getAgents(),
        listBackups(),
        listSkills(),
        listOllamaModels().catch(() => [])
      ]);

      res.json({ gateway, config, agents, backups, skills, ollamaModels });
    } catch (error) {
      res.status(500).json({ error: toMessage(error) });
    }
  });

  app.get("/api/config/raw", async (_req, res) => {
    try {
      res.json({ raw: await readConfigRaw() });
    } catch (error) {
      res.status(500).json({ error: toMessage(error) });
    }
  });

  app.put("/api/config/raw", async (req, res) => {
    try {
      await writeConfigRaw(req.body.raw);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: toMessage(error) });
    }
  });

  app.post("/api/config/validate", async (_req, res) => {
    try {
      res.json(await validateConfig());
    } catch (error) {
      res.status(400).json({ error: toMessage(error) });
    }
  });

  app.get("/api/gateway/logs", async (req, res) => {
    try {
      const lines = Number(req.query.lines ?? 120);
      res.json({ text: await readGatewayLog(lines) });
    } catch (error) {
      res.status(500).json({ error: toMessage(error) });
    }
  });

  app.post("/api/gateway/start", async (_req, res) => {
    try {
      res.json(await startGateway());
    } catch (error) {
      res.status(400).json({ error: toMessage(error) });
    }
  });

  app.post("/api/gateway/stop", async (_req, res) => {
    try {
      res.json(await stopGateway());
    } catch (error) {
      res.status(400).json({ error: toMessage(error) });
    }
  });

  app.post("/api/gateway/restart", async (_req, res) => {
    try {
      res.json(await restartGateway());
    } catch (error) {
      res.status(400).json({ error: toMessage(error) });
    }
  });

  app.get("/api/ollama/models", async (_req, res) => {
    try {
      res.json({ items: await listOllamaModels() });
    } catch (error) {
      res.status(400).json({ error: toMessage(error) });
    }
  });

  app.post("/api/models/primary", async (req, res) => {
    try {
      await setPrimaryModel(req.body.modelRef);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: toMessage(error) });
    }
  });

  app.post("/api/agents", async (req, res) => {
    try {
      await createAgent(req.body);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: toMessage(error) });
    }
  });

  app.post("/api/agents/test", async (req, res) => {
    try {
      res.json(await runAgentTest(req.body));
    } catch (error) {
      res.status(400).json({ error: toMessage(error) });
    }
  });

  app.post("/api/skills", async (req, res) => {
    try {
      await createSkill(req.body);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: toMessage(error) });
    }
  });

  app.post("/api/backups", async (_req, res) => {
    try {
      const path = await createBackup();
      res.json({ ok: true, path });
    } catch (error) {
      res.status(500).json({ error: toMessage(error) });
    }
  });

  app.post("/api/backups/restore", async (req, res) => {
    try {
      await restoreBackup(req.body.name);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: toMessage(error) });
    }
  });

  return app;
}

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}
