import { Router, type Request, type Response, type NextFunction } from "express";
import {
  readConfig,
  saveConfig,
  setPrimaryModel,
  upsertAgent,
  deleteAgent,
  validateConfigText,
} from "../services/config.js";
import { getStatus, startGateway, stopGateway, restartGateway, tailLogs, probeHealth } from "../services/gateway.js";
import { probeOllama } from "../services/ollama.js";
import { listAgents, testAgent } from "../services/agent.js";
import { listSkills, createSkill, deleteSkill } from "../services/skill.js";
import { createSnapshot, listSnapshots, restoreSnapshot, deleteSnapshot } from "../services/backup.js";

export const api = Router();

const ah = (fn: (req: Request, res: Response) => Promise<any> | any) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res)).catch(next);
};

api.get(
  "/overview",
  ah(async () => {
    const [config, status, ollama, snapshots] = await Promise.all([
      Promise.resolve(readConfig()),
      getStatus(),
      probeOllama(),
      Promise.resolve(listSnapshots().slice(0, 5)),
    ]);
    const agents = listAgents();
    const skills = listSkills();
    return {
      gateway: status,
      config,
      ollama: { available: ollama.available, baseUrl: ollama.baseUrl, modelCount: ollama.models.length, error: ollama.error },
      agents,
      skills: skills.slice(0, 12),
      skillCount: skills.length,
      snapshots,
    };
  })
);

api.get("/config", ah(async () => readConfig()));

api.post(
  "/config/validate",
  ah(async (req) => {
    const rawText = String(req.body?.rawText ?? "");
    const result = validateConfigText(rawText);
    return result;
  })
);

api.post(
  "/config",
  ah(async (req) => {
    const rawText = String(req.body?.rawText ?? "");
    return saveConfig({ rawText });
  })
);

api.post(
  "/config/primary-model",
  ah(async (req) => {
    const modelRef = String(req.body?.modelRef ?? "").trim();
    if (!modelRef) {
      const err = new Error("modelRef is required");
      (err as any).status = 400;
      throw err;
    }
    return setPrimaryModel(modelRef);
  })
);

api.post(
  "/config/agents",
  ah(async (req) => {
    const body = req.body ?? {};
    return upsertAgent({
      id: String(body.id ?? "").trim(),
      default: Boolean(body.default),
      skills: Array.isArray(body.skills) ? body.skills.map(String) : undefined,
      workspace: body.workspace ? String(body.workspace) : undefined,
    });
  })
);

api.delete(
  "/config/agents/:id",
  ah(async (req) => deleteAgent(req.params.id))
);

api.get("/gateway/status", ah(async () => getStatus()));
api.post("/gateway/start", ah(async () => startGateway()));
api.post("/gateway/stop", ah(async () => stopGateway()));
api.post("/gateway/restart", ah(async () => restartGateway()));
api.get(
  "/gateway/logs",
  ah(async (req) => {
    const lines = Math.min(Math.max(Number(req.query.lines ?? 300) || 300, 50), 2000);
    return tailLogs(lines);
  })
);
api.get("/gateway/health", ah(async () => probeHealth()));

api.get("/ollama", ah(async () => probeOllama()));

api.get("/agents", ah(async () => listAgents()));

api.post(
  "/agents/test",
  ah(async (req) => {
    const body = req.body ?? {};
    return testAgent({
      agentId: body.agentId ? String(body.agentId) : undefined,
      message: String(body.message ?? ""),
      thinking: body.thinking,
      timeoutSeconds: body.timeoutSeconds ? Number(body.timeoutSeconds) : undefined,
    });
  })
);

api.get("/skills", ah(async () => listSkills()));
api.post(
  "/skills",
  ah(async (req) => {
    const body = req.body ?? {};
    return createSkill({
      name: String(body.name ?? ""),
      description: String(body.description ?? ""),
      body: body.body ? String(body.body) : undefined,
    });
  })
);
api.delete(
  "/skills/:name",
  ah(async (req, res) => {
    deleteSkill(req.params.name);
    res.status(204).end();
  })
);

api.get("/snapshots", ah(async () => listSnapshots()));
api.post(
  "/snapshots",
  ah(async (req) => createSnapshot(String(req.body?.note ?? "")))
);
api.post(
  "/snapshots/:name/restore",
  ah(async (req) => restoreSnapshot(req.params.name))
);
api.delete(
  "/snapshots/:name",
  ah(async (req, res) => {
    deleteSnapshot(req.params.name);
    res.status(204).end();
  })
);

api.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = typeof err?.status === "number" ? err.status : 500;
  res.status(status).json({
    error: err?.message ?? "internal error",
  });
});
