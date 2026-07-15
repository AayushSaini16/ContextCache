import { useEffect, useMemo, useState } from "react";
import { Zap, Sparkles, CloudLightning, ArrowRight } from "lucide-react";

type Event = {
  id: number;
  kind: "exact" | "semantic" | "miss";
  provider: string;
  model: string;
  saved: number;
  latency: number;
  similarity?: number;
  at: number;
};

const providers = [
  { provider: "OpenAI", model: "gpt-4.1" },
  { provider: "OpenAI", model: "gpt-4o-mini" },
  { provider: "Anthropic", model: "claude-3-5-sonnet" },
  { provider: "Anthropic", model: "claude-3-5-haiku" },
];

function makeEvent(id: number, hitRate: number): Event {
  const roll = Math.random();
  const kind: Event["kind"] = roll < hitRate * 0.6 ? "exact" : roll < hitRate ? "semantic" : "miss";
  const p = providers[Math.floor(Math.random() * providers.length)];
  return {
    id,
    kind,
    provider: p.provider,
    model: p.model,
    saved: kind === "miss" ? 0 : Number((Math.random() * 0.03 + 0.005).toFixed(4)),
    latency: kind === "exact" ? 40 + Math.random() * 80 : kind === "semantic" ? 140 + Math.random() * 120 : 900 + Math.random() * 1200,
    similarity: kind === "semantic" ? Number((0.9 + Math.random() * 0.09).toFixed(2)) : undefined,
    at: Date.now(),
  };
}

export function ActivityFeed({ hitRate = 0.7 }: { hitRate?: number }) {
  const initial = useMemo(() => Array.from({ length: 6 }, (_, i) => makeEvent(i, hitRate)), [hitRate]);
  const [events, setEvents] = useState<Event[]>(initial);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let next = initial.length;
    const id = setInterval(() => {
      setEvents((prev) => [makeEvent(next++, hitRate), ...prev].slice(0, 8));
    }, 2600);
    const clock = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(id);
      clearInterval(clock);
    };
  }, [initial.length, hitRate]);

  return (
    <section className="rounded-xl border border-border/60 bg-card/60 shadow-elevated">
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <h2 className="text-sm font-medium">Live activity</h2>
        </div>
        <span className="text-xs text-muted-foreground">simulated feed · streaming</span>
      </div>
      <ul className="divide-y divide-border/40">
        {events.map((e) => (
          <ActivityRow key={e.id} event={e} tick={tick} />
        ))}
      </ul>
    </section>
  );
}

function ActivityRow({ event, tick }: { event: Event; tick: number }) {
  void tick;
  const seconds = Math.max(1, Math.round((Date.now() - event.at) / 1000));
  const meta =
    event.kind === "exact"
      ? { label: "Cache HIT", tone: "text-emerald-400", ring: "ring-emerald-400/30", bg: "bg-emerald-400/10", icon: Zap }
      : event.kind === "semantic"
        ? { label: "Semantic HIT", tone: "text-sky-400", ring: "ring-sky-400/30", bg: "bg-sky-400/10", icon: Sparkles }
        : { label: "Provider MISS", tone: "text-amber-400", ring: "ring-amber-400/30", bg: "bg-amber-400/10", icon: CloudLightning };
  const Icon = meta.icon;
  return (
    <li className="flex animate-in fade-in slide-in-from-top-1 items-center gap-4 px-6 py-3">
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${meta.bg} ring-1 ${meta.ring}`}>
        <Icon className={`h-4 w-4 ${meta.tone}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={`text-sm font-medium ${meta.tone}`}>{meta.label}</span>
          {event.similarity && (
            <span className="text-[11px] text-muted-foreground">similarity {(event.similarity * 100).toFixed(0)}%</span>
          )}
          <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-xs text-muted-foreground">{event.provider}</span>
          <span className="font-mono text-[11px] text-foreground/80">{event.model}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs">
        {event.saved > 0 && <span className="text-emerald-400">saved ${event.saved.toFixed(3)}</span>}
        <span className="tabular-nums text-muted-foreground">{Math.round(event.latency)}ms</span>
        <span className="w-16 text-right tabular-nums text-muted-foreground/70">
          {seconds < 60 ? `${seconds}s ago` : `${Math.round(seconds / 60)}m ago`}
        </span>
      </div>
    </li>
  );
}