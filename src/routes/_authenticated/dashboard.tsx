import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, DollarSign, Gauge, Percent, Rocket, KeyRound, BookOpen, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useActiveOrg } from "@/components/app-shell";
import { getDashboardStats } from "@/lib/analytics.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { ActivityFeed } from "@/components/activity-feed";
import { RequestTimeline } from "@/components/request-timeline";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function DashboardPage() {
  const { active } = useActiveOrg();
  const fetchStats = useServerFn(getDashboardStats);
  const q = useQuery({
    queryKey: ["stats", active?.id],
    queryFn: () => fetchStats({ data: { organizationId: active!.id, days: 7 } }),
    enabled: !!active,
    staleTime: 15_000,
  });
  const [selected, setSelected] = useState<any | null>(null);
  const hasData = !!q.data && q.data.total > 0;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">Last 7 days across all API keys.</p>
        </div>
        <Badge variant="outline" className="border-border/60">
          {active?.name ?? ""}
        </Badge>
      </header>

      <OnboardingChecklist />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Activity}
          label="Requests"
          value={q.data ? compact.format(q.data.total) : "—"}
          loading={q.isLoading}
          hint="Total requests routed through ContextCache in the selected window."
          why="Volume indicates how much of your traffic can benefit from caching."
          how="Point more of your production traffic at the ContextCache base URL."
        />
        <Stat
          icon={Percent}
          label="Cache hit rate"
          value={q.data ? `${(q.data.hitRate * 100).toFixed(1)}%` : "—"}
          loading={q.isLoading}
          hint="Share of requests served from either the exact or semantic cache."
          why="Higher hit rates reduce provider spend and slash p95 latency."
          how="Raise TTL, enable the semantic layer, or lower the similarity threshold slightly."
        />
        <Stat
          icon={DollarSign}
          label="Money saved"
          value={q.data ? currency.format(q.data.costSaved) : "—"}
          loading={q.isLoading}
          accent
          hint="Estimated cost avoided vs. calling the provider directly for each cached request."
          why="Direct proof of ROI — this is billing you didn't pay."
          how="More traffic + higher hit rate = more savings. Try enabling semantic cache."
        />
        <Stat
          icon={Gauge}
          label="Avg latency"
          value={q.data ? `${q.data.avgLatency} ms` : "—"}
          loading={q.isLoading}
          hint="Average end-to-end request latency across all routes."
          why="Cached responses return in ~50ms vs. seconds from upstream providers."
          how="Increase hit rate to pull this number down further."
        />
      </div>

      <ActivityFeed hitRate={q.data?.hitRate ?? 0.6} />

      <section className="rounded-xl border border-border/60 bg-card/60 p-6 shadow-elevated">
        <div className="mb-4">
          <h2 className="text-sm font-medium">Requests · last 7 days</h2>
          <p className="text-xs text-muted-foreground">Total vs. served from cache</p>
        </div>
        <div className="h-64">
          {q.isLoading || !q.data ? (
            <Skeleton className="h-full w-full" />
          ) : !hasData ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={q.data.daily}>
                <defs>
                  <linearGradient id="gReq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.75 0.15 230)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.75 0.15 230)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gHit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.82 0.17 155)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.82 0.17 155)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
                <XAxis dataKey="day" stroke="oklch(0.68 0.02 250)" fontSize={11} tickLine={false} />
                <YAxis stroke="oklch(0.68 0.02 250)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.20 0.014 250)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="requests" stroke="oklch(0.75 0.15 230)" fill="url(#gReq)" strokeWidth={2} />
                <Area type="monotone" dataKey="hits" stroke="oklch(0.82 0.17 155)" fill="url(#gHit)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/60 shadow-elevated">
        <div className="border-b border-border/60 px-6 py-4">
          <h2 className="text-sm font-medium">Recent requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 text-left">Time</th>
                <th className="px-6 py-3 text-left">Provider</th>
                <th className="px-6 py-3 text-left">Model</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Tokens</th>
                <th className="px-6 py-3 text-right">Latency</th>
                <th className="px-6 py-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {q.data?.recent.length ? (
                q.data.recent.map((r, i) => (
                  <tr
                    key={i}
                    onClick={() => setSelected(r)}
                    className="cursor-pointer border-t border-border/40 transition hover:bg-muted/30"
                  >
                    <td className="px-6 py-3 text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">{r.provider}</td>
                    <td className="px-6 py-3 font-mono text-xs">{r.model}</td>
                    <td className="px-6 py-3"><CacheBadge status={r.cache_status} /></td>
                    <td className="px-6 py-3 text-right">{r.total_tokens}</td>
                    <td className="px-6 py-3 text-right">{r.latency_ms} ms</td>
                    <td className="px-6 py-3 text-right">{currency.format(Number(r.cost_usd ?? 0))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12">
                    <EmptyTable />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Request details</SheetTitle>
                <SheetDescription>
                  {new Date(selected.created_at).toLocaleString()}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Provider" value={selected.provider} />
                  <Field label="Model" mono value={selected.model} />
                  <Field label="Status">
                    <CacheBadge status={selected.cache_status} />
                  </Field>
                  <Field label="Tokens" value={String(selected.total_tokens ?? "—")} />
                  <Field label="Latency" value={`${selected.latency_ms} ms`} />
                  <Field label="Cost" value={currency.format(Number(selected.cost_usd ?? 0))} />
                </div>
                <div>
                  <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    Timeline
                  </div>
                  <div className="rounded-md border border-border/60 bg-background/40 p-4">
                    <RequestTimeline
                      status={selected.cache_status}
                      latencyMs={Number(selected.latency_ms) || 0}
                      provider={selected.provider}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Raw JSON
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(selected, null, 2));
                        toast.success("Copied");
                      }}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                    </Button>
                  </div>
                  <pre className="max-h-96 overflow-auto rounded-md border border-border/60 bg-background/60 p-3 font-mono text-xs">
                    {JSON.stringify(selected, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 ${mono ? "font-mono text-xs" : "text-sm"}`}>{children ?? value}</div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
        <Activity className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium">No requests yet</p>
        <p className="text-xs text-muted-foreground">
          Make your first API call to see live analytics here.
        </p>
      </div>
    </div>
  );
}

function EmptyTable() {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <p className="text-sm font-medium">Waiting on your first request</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Point any OpenAI or Anthropic SDK at the ContextCache proxy and traffic will appear here in
        real time.
      </p>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        <Button size="sm" asChild>
          <Link to="/keys"><KeyRound className="mr-1 h-3.5 w-3.5" /> Create API key</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to="/quickstart"><Rocket className="mr-1 h-3.5 w-3.5" /> Quickstart</Link>
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link to="/docs"><BookOpen className="mr-1 h-3.5 w-3.5" /> Docs</Link>
        </Button>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  loading,
  accent,
  hint,
  why,
  how,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  loading?: boolean;
  accent?: boolean;
  hint?: string;
  why?: string;
  how?: string;
}) {
  return (
    <HoverCard openDelay={120}>
      <HoverCardTrigger asChild>
        <div className="group cursor-default rounded-xl border border-border/60 bg-card/60 p-5 shadow-elevated transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
            <span>{label}</span>
            <Icon className={`h-4 w-4 transition ${accent ? "text-primary" : "group-hover:text-primary"}`} />
          </div>
          <div className={`mt-3 text-3xl font-semibold tracking-tight ${accent ? "text-primary" : ""}`}>
            {loading ? <Skeleton className="h-8 w-24" /> : value}
          </div>
        </div>
      </HoverCardTrigger>
      {hint && (
        <HoverCardContent className="w-72 text-xs" side="bottom" align="start">
          <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
          <p className="text-muted-foreground">{hint}</p>
          {why && (
            <div className="mt-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">Why it matters</div>
              <p className="text-muted-foreground">{why}</p>
            </div>
          )}
          {how && (
            <div className="mt-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">How to improve</div>
              <p className="text-muted-foreground">{how}</p>
            </div>
          )}
        </HoverCardContent>
      )}
    </HoverCard>
  );
}

function CacheBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    exact_hit: { label: "exact hit", cls: "bg-primary/10 text-primary border-primary/30" },
    semantic_hit: { label: "semantic", cls: "bg-chart-2/10 text-chart-2 border-chart-2/30" },
    miss: { label: "miss", cls: "bg-muted text-muted-foreground border-border" },
  };
  const c = map[status] ?? map.miss;
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${c.cls}`}>
      {c.label}
    </span>
  );
}