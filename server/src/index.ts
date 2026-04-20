import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { api } from "./routes/api.js";
import { ensureDirs, PORT } from "./util/paths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveWebDir(): string | null {
  const candidates = [
    path.resolve(__dirname, "../../web/dist"),
    path.resolve(__dirname, "../web/dist"),
    path.resolve(process.cwd(), "web/dist"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "index.html"))) return c;
  }
  return null;
}

ensureDirs();

const app = express();
app.use(express.json({ limit: "4mb" }));
app.use("/api", api);

const webDir = resolveWebDir();
if (webDir) {
  app.use(express.static(webDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(webDir, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.type("text/html").send(
      `<!doctype html><meta charset="utf-8"><title>OpenClaw Manager</title>
       <div style="font-family:sans-serif;padding:2rem;max-width:42rem;color:#d1e4ff;background:#0a0f1d;min-height:100vh">
         <h1 style="color:#00e5ff">OpenClaw Manager API</h1>
         <p>Frontend bundle not found. Run <code>npm run build</code> or start the dev server on :5173.</p>
         <p>Try <a style="color:#00e5ff" href="/api/overview">/api/overview</a>.</p>
       </div>`
    );
  });
}

app.listen(PORT, "127.0.0.1", () => {
  console.log(`openclaw-manager listening at http://127.0.0.1:${PORT}`);
});
