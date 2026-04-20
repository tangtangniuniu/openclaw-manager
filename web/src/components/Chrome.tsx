import type { ReactNode } from "react";

export function StatusDot({ status }: { status: "ok" | "warn" | "bad" | "idle" }) {
  return <span className={`dot ${status === "idle" ? "" : status}`} />;
}

export function Pill({ tone = "idle", children }: { tone?: "ok" | "warn" | "bad" | "idle"; children: ReactNode }) {
  return <span className={`pill ${tone === "idle" ? "" : tone}`}>{children}</span>;
}

export function Stat({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: ReactNode;
  tone?: "ok" | "warn" | "bad";
  mono?: boolean;
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value${tone ? " " + tone : ""}${mono ? " mono" : ""}`}>{value}</span>
    </div>
  );
}

export function Banner({ tone = "ok", children }: { tone?: "ok" | "warn" | "bad"; children: ReactNode }) {
  return <div className={`banner ${tone}`}>{children}</div>;
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return <div className="loading">{label}</div>;
}

export function Card({
  title,
  actions,
  children,
  tight,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  tight?: boolean;
}) {
  return (
    <section className={`card${tight ? " tight" : ""}`}>
      {(title || actions) && (
        <div className="flex-row space-between" style={{ alignItems: "center", marginBottom: title ? "0.8rem" : 0 }}>
          {title ? <h3 style={{ margin: 0 }}>{title}</h3> : <span />}
          {actions && <div className="flex-row" style={{ gap: "0.4rem" }}>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
