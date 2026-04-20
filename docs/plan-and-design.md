# OpenClaw Manager 计划与设计

## 目标

做一个本机可用的 OpenClaw 管理 UI Web，覆盖日常运维高频动作：

1. 启动、停止、重启 OpenClaw Gateway
2. 查看并修改 `~/.openclaw/openclaw.json`
3. 切换主模型，优先支持 Ollama，并自动列出本地可用模型
4. 新建 agent、测试 agent
5. 创建 skill 模板
6. 备份与恢复 `~/.openclaw`
7. 提供状态、校验、快速操作等必要管理功能

## 参考资料

- `docs/reference/openclaw-configuration.md`
- `docs/reference/openclaw-configuration-examples.md`
- `docs/reference/openclaw-agent-send.md`
- `docs/reference/openclaw-getting-started.md`
- 本机配置：`~/.openclaw/openclaw.json`

## 当前环境判断

基于现有 `~/.openclaw/openclaw.json`：

- Gateway 本地模式，端口 `18789`
- 模型提供方当前只有 `ollama`
- 默认主模型 `ollama/qwen3.5:9b`
- Gateway 鉴权模式 `password`
- 已启用插件：`openclaw-web-search`、`ollama`
- 会话隔离模式 `per-channel-peer`

因此第一版优先做“本机控制台”，不是远程多用户 SaaS。

## 产品定位

界面做成“控制舱”风格：

- 深色工业底色
- 高对比黄铜/电蓝强调色
- 关键信息卡片化
- 操作集中在单页，减少来回跳转
- 保留原始 JSON 入口，避免 UI 不够用

## 功能规划

### Phase 1: 文档与骨架

- 保存参考文档到本地
- 输出产品计划与技术设计
- 初始化前后端工程

### Phase 2: 运行时控制

- Gateway 状态面板
- 启动 / 停止 / 重启
- 运行日志尾部查看
- 配置校验与健康检查

### Phase 3: 配置与模型

- 读取配置摘要
- 原始 JSON 编辑与保存
- 主模型切换
- Ollama 模型自动发现

### Phase 4: Agent / Skill 管理

- Agent 列表与新建
- Agent 测试执行
- Skill 模板创建

### Phase 5: 备份恢复

- 创建 `~/.openclaw` 备份快照
- 列出备份
- 一键恢复

### Phase 6: 验证与发布

- 补测试
- 本机联调
- 每个功能完成后单独 commit
- `gh` 创建公开仓库并推送

## 技术设计

### 架构

- 前端：React + Vite + TypeScript
- 后端：Node.js + Express + TypeScript
- 通信：REST API
- 配置解析：`json5`
- 核心命令执行：Node `child_process`

### 后端模块

1. `gateway-service`
   - 管理 gateway 进程启动/停止/重启
   - 保存 PID、日志文件、启动参数
2. `config-service`
   - 读取/写入 `~/.openclaw/openclaw.json`
   - 生成摘要
   - 更新主模型、agent、skill
3. `ollama-service`
   - 查询本地 Ollama 模型列表
4. `backup-service`
   - 备份与恢复 `~/.openclaw`
5. `agent-service`
   - 调用 `openclaw agent`
   - 返回测试结果

### 前端信息架构

单页 Dashboard，分 6 个区块：

1. Overview
   - Gateway 状态
   - 配置状态
   - 当前主模型
   - 默认 agent
2. Gateway Control
   - 启停重启
   - 端口、鉴权、日志
3. Model Forge
   - 提供商列表
   - Ollama 模型发现
   - 主模型切换
4. Agent Lab
   - agent 列表
   - 新建 agent
   - 测试消息
5. Skill Workshop
   - 创建 skill 模板
6. Vault
   - 备份、恢复、最近快照

## 关键实现约束

- 不破坏用户已有 `~/.openclaw` 数据
- 写配置前做 JSON5 解析和必要字段校验
- 恢复前自动生成额外备份，防误操作
- Gateway 控制优先使用本管理器自己维护的进程
- 保留原始命令输出，便于诊断

## 测试计划

- 单元测试：
  - 配置摘要
  - agent 写入
  - skill 模板生成
  - 备份文件名与恢复保护
- 集成测试：
  - API 路由
  - Gateway 运行状态解析
- 手工验证：
  - 读取真实 `~/.openclaw/openclaw.json`
  - 读取真实 Ollama 模型
  - 执行真实 `openclaw agent`

## 完成标准

- Web UI 可打开并可操作
- 关键功能都走真实 API，不是假按钮
- 本机验证通过
- git commit 按功能拆分
- 代码推送到公开 GitHub 仓库
