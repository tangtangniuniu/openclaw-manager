# OpenClaw Manager

本地 OpenClaw 管理台。目标：把 gateway 控制、模型切换、agent/skill 管理、备份恢复，收进一个顺手 Web UI。

## 功能

- 启动 / 停止 / 重启 OpenClaw Gateway
- 读取当前 `~/.openclaw/openclaw.json`
- 校验配置有效性
- 自动发现本地 Ollama 模型，并切换主模型
- 新建 agent，测试 agent
- 创建本地 skill 模板
- 备份与恢复 `~/.openclaw`
- 查看 gateway 日志尾部

## 技术栈

- React + Vite + TypeScript
- Express + TypeScript
- JSON5 配置解析
- `openclaw` CLI / `ollama` 本地集成

## 开发

```bash
pnpm install
pnpm dev
```

- 前端：`http://127.0.0.1:4173`
- 后端：`http://127.0.0.1:3187`

## 构建

```bash
pnpm build
node dist/server/server/index.js
```

## 说明

- 默认读取 `~/.openclaw/openclaw.json`
- 可用环境变量 `OPENCLAW_MANAGER_OPENCLAW_HOME` 指向别的 OpenClaw home
- 备份输出到 `data/backups/`

## 参考文档

- [docs/plan-and-design.md](docs/plan-and-design.md)
- `docs/reference/` 下保存了本地参考快照
