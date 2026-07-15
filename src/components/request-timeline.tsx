import { Shield, Route as RouteIcon, Zap, Sparkles, Cloud, CheckCircle2, Inbox } from "lucide-react";

type Step = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ms: number;
  active: boolean;
  detail?: string;
};

export function RequestTimeline({
  status,
  latencyMs,
  provider,
}: {
  status: string;
  latencyMs: number;
  provider: string;
}) {
  const isExact = status === "exact_hit";
  const isSemantic = status === "semantic_hit";
  const isMiss = status === "miss";

  // Reasonable synthetic breakdown that adds to the real total.
  const budget = Math.max(latencyMs, 4);
  const auth = Math.min(4, Math.round(budget * 0.03));
  const router = 2;
  const exact = Math.min(2, Math.round(budget * 0.02));
  const embed = isExact ? 0 : Math.min(50, Math.round(budget * 0.15));
  const semantic = isExact ? 0 : Math.min(30, Math.round(budget * 0.08));
  const providerMs = isMiss ? Math.max(0, budget - auth - router - exact - embed - semantic - 3) : 0;
  const response = Math.max(1, budget - auth - router - exact - embed - semantic - providerMs);

  const steps: Step[] = [
    { key: "in", label: "Request received", icon: Inbox, ms: 0, active: true, detail: "TLS terminated at edge" },
    { key: "auth", label: "Authentication", icon: Shield, ms: auth, active: true, detail: "API key verified · scoped to org" },
    { key: "router", label: "Provider router", icon: RouteIcon, ms: router, active: true, detail: `Dispatched to ${provider}` },
    { key: "exact", label: "Exact cache", icon: Zap, ms: exact, active: true, detail: isExact ? "HIT · served from Redis" : "MISS" },
    {
      key: "semantic",
      label: "Semantic cache",
      icon: Sparkles,
      ms: embed + semantic,
      active: !isExact,
      detail: isSemantic ? "HIT · pgvector similarity match" : isExact ? "skipped" : "MISS",
    },
    {
      key: "provider",
      label: `${provider} upstream`,
      icon: Cloud,
      ms: providerMs,
      active: isMiss,
      detail: isMiss ? "Streamed from provider" : "skipped",
    },
    { key: "out", label: "Response returned", icon: CheckCircle2, ms: response, active: true, detail: "Delivered to client" },
  ];

  return (
    <ol className="relative space-y-1">
      {steps.map((s, i) => {
        const Icon = s.icon;
        return (
          <li key={s.key} className="relative flex gap-3 py-1.5">
            <div className="relative flex flex-col items-center">
              <span
                className={`grid h-7 w-7 place-items-center rounded-full border transition ${
                  s.active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/40 bg-muted/30 text-muted-foreground/50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              {i < steps.length - 1 && (
                <span
                  className={`mt-1 w-px flex-1 ${s.active ? "bg-primary/30" : "bg-border/40"}`}
                  style={{ minHeight: 16 }}
                />
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-sm ${s.active ? "font-medium" : "text-muted-foreground/60"}`}>
                  {s.label}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {s.active ? `${s.ms}ms` : "—"}
                </span>
              </div>
              {s.detail && <div className="text-xs text-muted-foreground">{s.detail}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}