import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  XCircle,
  Database,
  Server,
  Boxes,
  Cpu,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/status")({
  component: StatusPage,
});

type State = "operational" | "degraded" | "maintenance" | "offline";

type Service = {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  state: State;
  uptime: number;
  responseMs: number;
  region: string;
};

const services: Service[] = [
  { name: "API Gateway", icon: Activity, state: "operational", uptime: 99.998, responseMs: 42, region: "global" },
  { name: "Proxy Router", icon: Server, state: "operational", uptime: 99.994, responseMs: 18, region: "global" },
  { name: "Redis · Exact Cache", icon: Boxes, state: "operational", uptime: 99.999, responseMs: 1, region: "us-east" },
  { name: "PostgreSQL", icon: Database, state: "operational", uptime: 99.987, responseMs: 6, region: "us-east" },
  { name: "pgvector · Semantic", icon: Cpu, state: "operational", uptime: 99.982, responseMs: 34, region: "us-east" },
  { name: "OpenAI Provider", icon: Sparkles, state: "operational", uptime: 99.94, responseMs: 812, region: "upstream" },
  { name: "Anthropic Provider", icon: Sparkles, state: "operational", uptime: 99.91, responseMs: 764, region: "upstream" },
];

const incidents = [
  {
    date: "2026-07-11",
    title: "Elevated semantic cache latency",
    resolved: true,
    duration: "23m",
    detail:
      "pgvector queries returned elevated p95 latency in us-east. Auto-scaled read replicas and restored normal performance.",
  },
  {
    date: "2026-06-28",
    title: "OpenAI upstream — provider incident",
    resolved: true,
    duration: "1h 12m",
    detail:
      "Upstream 5xx surge from OpenAI. ContextCache continued serving cached responses; provider fallbacks re-enabled at 14:22 UTC.",
  },
  {
    date: "2026-06-04",
    title: "Scheduled Postgres maintenance",
    resolved: true,
    duration: "8m",
    detail: "Zero-downtime failover to a new primary in us-east. No user-facing impact.",
  },
];

const STATE_META: Record<State, { label: string; dot: string; ring: string; icon: React.ComponentType<{ className?: string }> }> = {
  operational: { label: "Operational", dot: "bg-emerald-400", ring: "ring-emerald-400/30", icon: CheckCircle2 },
  degraded: { label: "Degraded", dot: "bg-amber-400", ring: "ring-amber-400/30", icon: AlertTriangle },
  maintenance: { label: "Maintenance", dot: "bg-sky-400", ring: "ring-sky-400/30", icon: Wrench },
  offline: { label: "Offline", dot: "bg-red-500", ring: "ring-red-500/30", icon: XCircle },
};

function StatusPage() {
  const worst = services.reduce<State>((acc, s) => {
    const rank = { operational: 0, maintenance: 1, degraded: 2, offline: 3 } as const;
    return rank[s.state] > rank[acc] ? s.state : acc;
  }, "operational");
  const meta = STATE_META[worst];
  const Icon = meta.icon;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-card/40 p-6 shadow-elevated sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className={`relative grid h-12 w-12 place-items-center rounded-full bg-background ring-8 ${meta.ring}`}>
            <Icon className="h-6 w-6 text-emerald-400" />
            <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full ${meta.dot}`} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">All systems {meta.label.toLowerCase()}</h1>
            <p className="text-sm text-muted-foreground">
              Real-time health across ContextCache infrastructure · updated continuously
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Metric label="90-day uptime" value="99.994%" />
          <Metric label="Avg. p50 latency" value="47ms" />
        </div>
      </header>

      <section className="rounded-xl border border-border/60 bg-card/60 shadow-elevated">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <h2 className="text-sm font-medium">Service health</h2>
          <span className="text-xs text-muted-foreground">last 90 days</span>
        </div>
        <ul className="divide-y divide-border/40">
          {services.map((s) => (
            <ServiceRow key={s.name} service={s} />
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/60 shadow-elevated">
        <div className="border-b border-border/60 px-6 py-4">
          <h2 className="text-sm font-medium">Incident history</h2>
          <p className="text-xs text-muted-foreground">Past 90 days · all incidents resolved</p>
        </div>
        <ol className="relative space-y-6 px-6 py-6">
          {incidents.map((i, idx) => (
            <li key={idx} className="relative pl-8">
              <span className="absolute left-2 top-1.5 h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
              {idx < incidents.length - 1 && (
                <span className="absolute left-[11px] top-4 h-full w-px bg-border/60" />
              )}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{i.date}</span>
                <h3 className="text-sm font-medium">{i.title}</h3>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  Resolved · {i.duration}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{i.detail}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function ServiceRow({ service }: { service: Service }) {
  const meta = STATE_META[service.state];
  const [bars] = useState(() =>
    Array.from({ length: 60 }, (_, i) => {
      // deterministic seeded jitter so SSR matches
      const seed = (i * 9301 + 49297) % 233280;
      const r = seed / 233280;
      return r < 0.98 ? "op" : "deg";
    }),
  );
  const Icon = service.icon;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto]">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border/60 bg-background/40">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{service.name}</div>
          <div className="text-xs text-muted-foreground">
            {service.region} · {service.responseMs}ms · {service.uptime.toFixed(3)}% uptime
          </div>
        </div>
      </div>
      <div className="col-span-2 flex items-end gap-[2px] sm:col-span-1">
        {bars.map((b, i) => (
          <span
            key={i}
            className={`h-6 flex-1 rounded-[1px] ${b === "op" ? "bg-emerald-400/70" : "bg-amber-400/80"}`}
            style={{ minWidth: 2 }}
          />
        ))}
      </div>
      <div className="col-start-2 flex items-center gap-2 sm:col-start-3">
        <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
        <span className="text-xs font-medium">{meta.label}</span>
      </div>
    </li>
  );
}