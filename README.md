# OpenClaw Manager

A sleek, tech-forward control panel for [OpenClaw](https://news-openclaw.smzdm.com/). One command, one page, everything you need to babysit your local gateway.

![hero](docs/hero.png)

## Features

- **Gateway Control** — start, stop, restart, tail logs, see live status
- **Config Studio** — JSON5-aware editor for `~/.openclaw/openclaw.json` with summary cards
- **Model Forge** — auto-discover local Ollama models, switch the primary model in one click
- **Agent Lab** — list configured agents, create new ones, send test messages via `openclaw agent`
- **Skill Workshop** — scaffold skill templates under `~/.openclaw/skills`
- **Vault** — snapshot and restore the whole `~/.openclaw` directory with auto-safeguard backups

## Requirements

- Node.js 22+ (24 recommended)
- `openclaw` CLI on PATH
- `ollama` (optional, for local model discovery)

## Quick start

```bash
npm install
npm run build
npm start
# open http://127.0.0.1:18790
```

Or in dev:

```bash
npm install
npm run dev
# web at http://127.0.0.1:5173, API at http://127.0.0.1:18790
```

## Architecture

- `server/` — Node.js + Express + TypeScript backend
- `web/`    — React + Vite + TypeScript frontend
- State lives under `~/.openclaw-manager/` (pid, logs, backups)
- User config untouched except through explicit actions

## Safety

- Every write to `openclaw.json` is preceded by a timestamped backup in `~/.openclaw-manager/backups/config/`
- Restore creates a pre-restore snapshot automatically
- JSON5 parse + basic field check before save

## License

MIT
