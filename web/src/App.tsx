import { useState } from "react";
import OverviewPanel from "./panels/OverviewPanel";
import GatewayPanel from "./panels/GatewayPanel";
import ModelPanel from "./panels/ModelPanel";
import AgentPanel from "./panels/AgentPanel";
import SkillPanel from "./panels/SkillPanel";
import VaultPanel from "./panels/VaultPanel";
import ConfigPanel from "./panels/ConfigPanel";

type TabKey = "overview" | "gateway" | "model" | "agent" | "skill" | "vault" | "config";

const TABS: { key: TabKey; label: string; sub: string; idx: string }[] = [
  { key: "overview", label: "Overview",    sub: "station at a glance", idx: "01" },
  { key: "gateway",  label: "Gateway",     sub: "runtime control",     idx: "02" },
  { key: "model",    label: "Model Forge", sub: "ollama / primary",    idx: "03" },
  { key: "agent",    label: "Agent Lab",   sub: "test & compose",      idx: "04" },
  { key: "skill",    label: "Skill Works", sub: "scaffold templates",  idx: "05" },
  { key: "vault",    label: "Vault",       sub: "backup & restore",    idx: "06" },
  { key: "config",   label: "Config Core", sub: "raw json editor",     idx: "07" },
];

export default function App() {
  const [tab, setTab] = useState<TabKey>("overview");
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">◈</div>
          <div>
            <div className="brand-title">OpenClaw</div>
            <div className="brand-subtitle">Control Deck</div>
          </div>
        </div>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`nav-item${t.key === tab ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <span className="idx">{t.idx}</span>
            <span style={{ flex: 1 }}>
              <div style={{ color: "inherit", lineHeight: 1.1 }}>{t.label}</div>
              <div className="small dim" style={{ letterSpacing: "0.1em" }}>{t.sub}</div>
            </span>
          </button>
        ))}
        <div className="footer">
          <div>◉ LOCAL 127.0.0.1</div>
          <div>port <span className="mono">18790</span></div>
          <div className="dim">claw // v0.1</div>
        </div>
      </aside>
      <main>
        <div className="topbar">
          <span className="crumbs">
            // {current.idx} · {current.sub}
          </span>
          <h1>{current.label}</h1>
          <span className="crumbs mono">claw-deck @ local</span>
        </div>
        {tab === "overview" && <OverviewPanel onJump={setTab} />}
        {tab === "gateway" && <GatewayPanel />}
        {tab === "model" && <ModelPanel />}
        {tab === "agent" && <AgentPanel />}
        {tab === "skill" && <SkillPanel />}
        {tab === "vault" && <VaultPanel />}
        {tab === "config" && <ConfigPanel />}
      </main>
    </div>
  );
}
