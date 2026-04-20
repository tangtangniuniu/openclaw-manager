import path from "node:path";
import express from "express";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3187);
const app = createApp();
const clientRoot = path.resolve(process.cwd(), "dist/client");

app.use(express.static(clientRoot));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    next();
    return;
  }

  res.sendFile(path.join(clientRoot, "index.html"), (error) => {
    if (error) {
      next();
    }
  });
});

app.listen(port, () => {
  console.log(`OpenClaw Manager API on http://127.0.0.1:${port}`);
});

