import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Copy,
  Cpu,
  Database,
  KeyRound,
  Layers,
  Play,
  RefreshCw,
  Repeat,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type StageKey =
  | "request"
  | "gateway"
  | "auth"
  | "router"
  | "exact"
  | "semantic"
  | "decision"
  | "provider"
  | "response";

type Stage = {
  key: StageKey;
  label: string;
  icon: typeof Zap;
  detail?: string;
};

const STAGES: Stage[] = [
  { key: "request", label: "Request", icon: Send },
  { key: "gateway", label: "API Gateway", icon: Layers },
  { key: "auth", label: "Authentication", icon: KeyRound },
  { key: "router", label: "Provider Router", icon: Repeat },
  { key: "exact", label: "Exact Cache", icon: Database },
  { key: "semantic", label: "Semantic Cache", icon: Sparkles },
  { key: "decision", label: "Cache Decision", icon: Cpu },
  { key: "provider", label: "LLM Provider", icon: Zap },
  { key: "response", label: "Response", icon: Check },
];

type Scenario = "miss" | "exact" | "semantic";

type StageResult = "pending" | "active" | "hit" | "miss" | "skipped" | "done";

type Metrics = {
  status: "MISS" | "HIT" | "SEMANTIC";
  latency: number;
  tokens: number;
  cost: number;
  saved: number;
  similarity?: number;
};

const SAMPLE_PROMPTS = [
  "Explain quantum computing in simple terms.",
  "Can you explain quantum computing for a beginner?",
  "Summarise the CAP theorem for a junior engineer.",
];

function useCounter(value: number, duration = 700) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const initial = from.current;
    const delta = value - initial;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(initial + delta * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

function Counter({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const d = useCounter(value);
  return <span className={className}>{format(d)}</span>;
}

const fmtUsd = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(2)}k` : `$${n.toFixed(3)}`;
const fmtMs = (n: number) => `${Math.round(n)}ms`;
const fmtInt = (n: number) => Math.round(n).toLocaleString();

export function Playground() {
  const reduce = useReducedMotion();
  const [prompt, setPrompt] = useState(SAMPLE_PROMPTS[0]);
  const [provider, setProvider] = useState<"OpenAI" | "Anthropic">("OpenAI");
  const [stageState, setStageState] = useState<Record<StageKey, StageResult>>(
    Object.fromEntries(STAGES.map((s) => [s.key, "pending"])) as Record<
      StageKey,
      StageResult
    >
  );
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [running, setRunning] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [totals, setTotals] = useState({
    requests: 0,
    hits: 0,
    saved: 0,
    latencySum: 0,
  });
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  const setStage = (k: StageKey, r: StageResult) =>
    setStageState((prev) => ({ ...prev, [k]: r }));

  const schedule = (fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, reduce ? Math.min(50, ms) : ms);
    timers.current.push(t);
  };

  const resetStages = () =>
    setStageState(
      Object.fromEntries(STAGES.map((s) => [s.key, "pending"])) as Record<
        StageKey,
        StageResult
      >
    );

  const runScenario = (sc: Scenario) => {
    clearTimers();
    resetStages();
    setRunning(true);
    setScenario(sc);
    setMetrics(null);
    let t = 0;
    const walk = (key: StageKey, dwell = 260, result: StageResult = "done") => {
      schedule(() => setStage(key, "active"), t);
      t += dwell;
      schedule(() => setStage(key, result), t);
    };
    walk("request", 220);
    walk("gateway", 220);
    walk("auth", 220);
    walk("router", 240);

    if (sc === "miss") {
      walk("exact", 300, "miss");
      walk("semantic", 320, "miss");
      walk("decision", 240, "miss");
      walk("provider", 900, "done");
      walk("response", 260, "done");
      const finalT = t + 100;
      schedule(() => {
        const m: Metrics = {
          status: "MISS",
          latency: 1800,
          tokens: 420,
          cost: 0.023,
          saved: 0,
        };
        setMetrics(m);
        setTotals((p) => ({
          requests: p.requests + 1,
          hits: p.hits,
          saved: p.saved,
          latencySum: p.latencySum + m.latency,
        }));
        setRunning(false);
        setLastPrompt(prompt);
      }, finalT);
    } else if (sc === "exact") {
      walk("exact", 340, "hit");
      schedule(() => setStage("semantic", "skipped"), t);
      schedule(() => setStage("decision", "hit"), t + 60);
      schedule(() => setStage("provider", "skipped"), t + 120);
      walk("response", 260, "done");
      const finalT = t + 400;
      schedule(() => {
        const m: Metrics = {
          status: "HIT",
          latency: 120,
          tokens: 420,
          cost: 0,
          saved: 0.023,
        };
        setMetrics(m);
        setTotals((p) => ({
          requests: p.requests + 1,
          hits: p.hits + 1,
          saved: p.saved + m.saved,
          latencySum: p.latencySum + m.latency,
        }));
        setRunning(false);
        setLastPrompt(prompt);
      }, finalT);
    } else {
      walk("exact", 300, "miss");
      walk("semantic", 360, "hit");
      schedule(() => setStage("decision", "hit"), t + 60);
      schedule(() => setStage("provider", "skipped"), t + 120);
      walk("response", 260, "done");
      const finalT = t + 400;
      schedule(() => {
        const m: Metrics = {
          status: "SEMANTIC",
          latency: 140,
          tokens: 420,
          cost: 0,
          saved: 0.023,
          similarity: 92,
        };
        setMetrics(m);
        setTotals((p) => ({
          requests: p.requests + 1,
          hits: p.hits + 1,
          saved: p.saved + m.saved,
          latencySum: p.latencySum + m.latency,
        }));
        setRunning(false);
        setLastPrompt(prompt);
      }, finalT);
    }
  };

  const onSend = () => {
    if (running) return;
    if (lastPrompt === null) return runScenario("miss");
    if (prompt.trim() === lastPrompt.trim()) return runScenario("exact");
    // simple similarity heuristic — if shares ≥40% words, semantic hit
    const a = new Set(lastPrompt.toLowerCase().split(/\W+/).filter(Boolean));
    const b = prompt.toLowerCase().split(/\W+/).filter(Boolean);
    const overlap = b.filter((w) => a.has(w)).length / Math.max(b.length, 1);
    if (overlap >= 0.35) return runScenario("semantic");
    runScenario("miss");
  };

  const onSendAgain = () => {
    if (running) return;
    if (lastPrompt) setPrompt(lastPrompt);
    runScenario("exact");
  };

  const onReset = () => {
    clearTimers();
    resetStages();
    setMetrics(null);
    setScenario(null);
    setLastPrompt(null);
    setTotals({ requests: 0, hits: 0, saved: 0, latencySum: 0 });
    setRunning(false);
  };

  const hitRate =
    totals.requests > 0 ? (totals.hits / totals.requests) * 100 : 0;
  const avgLat =
    totals.requests > 0 ? totals.latencySum / totals.requests : 0;

  return (
    <div id="how" className="scroll-mt-24 border-t border-border/40 bg-card/20">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="font-mono text-xs tracking-widest text-primary">
            INTERACTIVE PLAYGROUND
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Watch a request flow through ContextCache.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Simulate a live call. First one misses the cache. Send it again and
            watch it return in milliseconds.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          {/* LEFT — request composer */}
          <div className="rounded-2xl border border-border/60 bg-card/70 shadow-elevated">
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              <span className="ml-2 font-mono text-xs text-muted-foreground">
                POST /v1/chat/completions
              </span>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Provider
                </label>
                <div className="flex gap-2">
                  {(["OpenAI", "Anthropic"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setProvider(p)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs font-medium transition",
                        provider === p
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-md border border-border/60 bg-background/60 p-3 font-mono text-sm outline-none focus:border-primary/60"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SAMPLE_PROMPTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setPrompt(s)}
                      className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    >
                      {s.length > 40 ? s.slice(0, 38) + "…" : s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={onSend} disabled={running} size="sm">
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Send Request
                </Button>
                <Button
                  onClick={onSendAgain}
                  disabled={running || !lastPrompt}
                  size="sm"
                  variant="secondary"
                >
                  <Repeat className="mr-1.5 h-3.5 w-3.5" /> Send Again
                </Button>
                <Button
                  onClick={onReset}
                  disabled={running}
                  size="sm"
                  variant="ghost"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset Demo
                </Button>
              </div>

              <AnimatePresence mode="wait">
                {metrics && (
                  <motion.div
                    key={metrics.status + (lastPrompt ?? "")}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="rounded-lg border border-border/60 bg-background/40 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Result
                      </div>
                      <StatusBadge status={metrics.status} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                      <Metric label="Latency" value={fmtMs(metrics.latency)} />
                      <Metric label="Tokens" value={fmtInt(metrics.tokens)} />
                      <Metric label="Cost" value={fmtUsd(metrics.cost)} />
                      <Metric
                        label={metrics.status === "MISS" ? "Saved" : "Money Saved"}
                        value={fmtUsd(metrics.saved)}
                        accent={metrics.saved > 0}
                      />
                    </div>
                    {metrics.status === "SEMANTIC" && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Prompt matched a stored embedding at{" "}
                        <span className="font-medium text-foreground">
                          {metrics.similarity}% similarity
                        </span>
                        . Served from semantic cache — no provider call.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT — pipeline */}
          <div className="rounded-2xl border border-border/60 bg-card/70 shadow-elevated">
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
              <span className="font-mono text-xs text-muted-foreground">
                request-lifecycle
              </span>
              {scenario && (
                <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-primary">
                  {scenario === "miss"
                    ? "First request"
                    : scenario === "exact"
                      ? "Exact-cache hit"
                      : "Semantic hit"}
                </span>
              )}
            </div>
            <div className="p-5">
              <ol className="relative space-y-2">
                {STAGES.map((s, i) => (
                  <StageRow
                    key={s.key}
                    stage={s}
                    state={stageState[s.key]}
                    isLast={i === STAGES.length - 1}
                  />
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* Live metrics */}
        <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-border/60 bg-card/50 p-4 md:grid-cols-5">
          <LiveMetric label="Requests" value={totals.requests} format={fmtInt} />
          <LiveMetric label="Cache Hits" value={totals.hits} format={fmtInt} />
          <LiveMetric
            label="Money Saved"
            value={totals.saved}
            format={(n) => `$${n.toFixed(3)}`}
          />
          <LiveMetric label="Avg Latency" value={avgLat} format={fmtMs} />
          <LiveMetric
            label="Hit Rate"
            value={hitRate}
            format={(n) => `${n.toFixed(0)}%`}
          />
        </div>

        <CodePreview />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Metrics["status"] }) {
  const map = {
    MISS: {
      cls: "bg-destructive/15 text-destructive border-destructive/30",
      label: "MISS",
    },
    HIT: {
      cls: "bg-primary/15 text-primary border-primary/40",
      label: "EXACT HIT",
    },
    SEMANTIC: {
      cls: "bg-primary/15 text-primary border-primary/40",
      label: "SEMANTIC HIT",
    },
  } as const;
  const m = map[status];
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-widest",
        m.cls
      )}
    >
      {m.label}
    </span>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 font-mono text-base",
          accent ? "text-primary" : "text-foreground"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function LiveMetric({
  label,
  value,
  format,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
}) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <Counter
        value={value}
        format={format}
        className="mt-1 block font-mono text-lg text-foreground"
      />
    </div>
  );
}

function StageRow({
  stage,
  state,
  isLast,
}: {
  stage: Stage;
  state: StageResult;
  isLast: boolean;
}) {
  const Icon = stage.icon;
  const active = state === "active";
  const done = state === "done" || state === "hit" || state === "miss";
  const skipped = state === "skipped";

  const tone =
    state === "hit"
      ? "text-primary border-primary/50 bg-primary/10"
      : state === "miss"
        ? "text-destructive border-destructive/40 bg-destructive/10"
        : state === "skipped"
          ? "text-muted-foreground/50 border-border/40 bg-transparent"
          : active
            ? "text-foreground border-primary/60 bg-primary/5"
            : done
              ? "text-foreground border-border/60 bg-background/40"
              : "text-muted-foreground border-border/40 bg-transparent";

  return (
    <li className="relative">
      <motion.div
        initial={false}
        animate={{
          scale: active ? 1.01 : 1,
          opacity: skipped ? 0.4 : 1,
        }}
        transition={{ duration: 0.25 }}
        className={cn(
          "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
          tone
        )}
      >
        <div
          className={cn(
            "grid h-7 w-7 place-items-center rounded-md border",
            state === "hit"
              ? "border-primary/40 bg-primary/15"
              : state === "miss"
                ? "border-destructive/40 bg-destructive/15"
                : "border-border/60 bg-background/60"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="flex-1">{stage.label}</span>
        <StageStatus state={state} />
        {active && (
          <motion.span
            className="absolute inset-0 rounded-lg border border-primary/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}
      </motion.div>
      {!isLast && (
        <div className="relative mx-auto my-0.5 h-3 w-px bg-border/60">
          {active && (
            <motion.span
              className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary"
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 12, opacity: 1 }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}
        </div>
      )}
    </li>
  );
}

function StageStatus({ state }: { state: StageResult }) {
  if (state === "hit")
    return (
      <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
        hit
      </span>
    );
  if (state === "miss")
    return (
      <span className="font-mono text-[10px] uppercase tracking-widest text-destructive">
        miss
      </span>
    );
  if (state === "skipped")
    return (
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
        skipped
      </span>
    );
  if (state === "active")
    return (
      <motion.span
        className="h-1.5 w-1.5 rounded-full bg-primary"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
    );
  if (state === "done")
    return <Check className="h-3.5 w-3.5 text-primary" />;
  return <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />;
}

function CodePreview() {
  const [copied, setCopied] = useState<string | null>(null);
  const samples: Record<string, string> = {
    Python: `from openai import OpenAI

client = OpenAI(
    api_key="cc_live_...",
    base_url="https://api.contextcache.dev/v1",
)

resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hi"}],
)`,
    TypeScript: `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.CONTEXTCACHE_API_KEY,
  baseURL: "https://api.contextcache.dev/v1",
});

await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hi" }],
});`,
    curl: `curl https://api.contextcache.dev/v1/chat/completions \\
  -H "Authorization: Bearer cc_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hi"}]}'`,
    "OpenAI SDK": `// Only the base URL changes.
const client = new OpenAI({
  apiKey: process.env.CONTEXTCACHE_API_KEY,
  baseURL: "https://api.contextcache.dev/v1",
});`,
    "Anthropic SDK": `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.CONTEXTCACHE_API_KEY,
  baseURL: "https://api.contextcache.dev",
});`,
  };
  const tabs = Object.keys(samples);
  return (
    <div className="mt-10 rounded-2xl border border-border/60 bg-card/70 shadow-elevated">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
        <span className="font-mono text-xs text-muted-foreground">
          drop-in integration
        </span>
        <span className="text-[10px] uppercase tracking-widest text-primary">
          One line changes
        </span>
      </div>
      <Tabs defaultValue={tabs[0]} className="p-4">
        <TabsList className="flex-wrap">
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t} className="text-xs">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t} value={t} className="relative">
            <pre className="overflow-x-auto rounded-md border border-border/60 bg-background/60 p-4 font-mono text-[12.5px] leading-relaxed">
              <code>{samples[t]}</code>
            </pre>
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-2 top-2 h-7 px-2"
              onClick={async () => {
                await navigator.clipboard.writeText(samples[t]);
                setCopied(t);
                setTimeout(() => setCopied(null), 1200);
              }}
            >
              {copied === t ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}