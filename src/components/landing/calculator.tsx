import { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Link } from "@tanstack/react-router";
import { MODELS, calcSavings } from "@/lib/model-pricing";

function useCounter(value: number, duration = 600) {
  const [d, setD] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const initial = from.current;
    const delta = value - initial;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setD(initial + delta * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return d;
}

const fmtMoney = (n: number) =>
  n >= 1000
    ? `$${(n / 1000).toFixed(1)}k`
    : `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fmtInt = (n: number) => Math.round(n).toLocaleString();

export function Calculator() {
  const [requests, setRequests] = useState(2_000_000);
  const [inputTokens, setInputTokens] = useState(600);
  const [outputTokens, setOutputTokens] = useState(400);
  const [modelId, setModelId] = useState(MODELS[1].id);
  const [hitRate, setHitRate] = useState(72);
  const [similarity, setSimilarity] = useState(85);

  const result = useMemo(
    () =>
      calcSavings({
        requests,
        inputTokens,
        outputTokens,
        modelId,
        hitRate: hitRate / 100,
      }),
    [requests, inputTokens, outputTokens, modelId, hitRate]
  );

  const dSaved = useCounter(result.monthlySaved);
  const dAnnual = useCounter(result.annualSaved);
  const dBase = useCounter(result.baselineCost);
  const dWith = useCounter(result.withCost);
  const dLat = useCounter(result.latencyReductionPct);
  const dRed = useCounter(result.costReductionPct);

  const withWidth = Math.max(
    4,
    Math.min(100, (result.withCost / Math.max(result.baselineCost, 1e-6)) * 100)
  );

  return (
    <section
      id="calculator"
      className="scroll-mt-24 border-t border-border/40"
    >
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="font-mono text-xs tracking-widest text-primary">
            SAVINGS CALCULATOR
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            See what ContextCache would save your team.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Estimate monthly and annual savings based on your workload.
            Numbers update as you tune the sliders.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          {/* Inputs */}
          <div className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-elevated">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Your workload
            </h3>
            <div className="mt-6 space-y-6">
              <NumberField
                label="Monthly LLM requests"
                value={requests}
                onChange={setRequests}
                step={10_000}
                min={1_000}
                max={100_000_000}
                suffix="req/mo"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Avg prompt tokens"
                  value={inputTokens}
                  onChange={setInputTokens}
                  step={50}
                  min={10}
                  max={20_000}
                />
                <NumberField
                  label="Avg response tokens"
                  value={outputTokens}
                  onChange={setOutputTokens}
                  step={50}
                  min={10}
                  max={20_000}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Model
                </label>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setModelId(m.id)}
                      className={`rounded-md border px-3 py-2 text-left text-xs transition ${
                        modelId === m.id
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="font-medium">{m.label}</div>
                      <div className="mt-0.5 text-[10px] opacity-70">
                        {m.provider}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <SliderField
                label="Estimated cache hit rate"
                value={hitRate}
                onChange={setHitRate}
                suffix="%"
              />
              <SliderField
                label="Average prompt similarity"
                value={similarity}
                onChange={setSimilarity}
                suffix="%"
              />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <BigStat
                label="Monthly money saved"
                value={fmtMoney(dSaved)}
                accent
                icon={<TrendingDown className="h-4 w-4" />}
              />
              <BigStat
                label="Annual money saved"
                value={fmtMoney(dAnnual)}
                accent
              />
              <BigStat
                label="Cost reduction"
                value={`${dRed.toFixed(0)}%`}
              />
              <BigStat
                label="Latency reduction"
                value={`${dLat.toFixed(0)}%`}
              />
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-elevated">
              <div className="grid gap-4 sm:grid-cols-2">
                <SmallCol
                  title="Without ContextCache"
                  rows={[
                    ["Monthly cost", fmtMoney(dBase)],
                    ["Avg latency", `${Math.round(result.baselineLatency)}ms`],
                    ["Provider calls", fmtInt(requests)],
                  ]}
                />
                <SmallCol
                  title="With ContextCache"
                  accent
                  rows={[
                    ["Monthly cost", fmtMoney(dWith)],
                    [
                      "Avg latency",
                      `${Math.round(result.withLatency)}ms`,
                    ],
                    ["Cache hits", fmtInt(result.cacheHits)],
                    ["Provider calls", fmtInt(result.providerCalls)],
                    ["Tokens saved", fmtInt(result.tokensSaved)],
                  ]}
                />
              </div>

              <div className="mt-6 space-y-3">
                <BarRow
                  label="Without"
                  value={fmtMoney(result.baselineCost)}
                  width={100}
                  tone="muted"
                />
                <BarRow
                  label="With ContextCache"
                  value={fmtMoney(result.withCost)}
                  width={withWidth}
                  tone="primary"
                />
                <div className="flex items-center justify-between pt-1 text-sm">
                  <span className="text-muted-foreground">Savings</span>
                  <span className="font-mono text-primary">
                    {result.costReductionPct.toFixed(0)}%
                  </span>
                </div>
              </div>

              <p className="mt-6 text-sm text-muted-foreground">
                With ~{fmtInt(requests)} requests per month on{" "}
                <span className="text-foreground">{result.model.label}</span>{" "}
                and a {hitRate}% cache hit rate, ContextCache could save an
                estimated{" "}
                <span className="font-medium text-foreground">
                  {fmtMoney(result.annualSaved)}
                </span>{" "}
                per year while reducing average latency by{" "}
                <span className="font-medium text-foreground">
                  {result.latencyReductionPct.toFixed(0)}%
                </span>
                .
              </p>

              <p className="mt-3 text-xs text-muted-foreground/70">
                These are estimated savings based on average model pricing and
                cache efficiency. Actual results depend on workload
                characteristics.
              </p>

              <div className="mt-6">
                <Button asChild size="lg">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Start saving today
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step: number;
  min: number;
  max: number;
  suffix?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        {suffix && <span className="opacity-60">{suffix}</span>}
      </label>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) =>
          onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))
        }
        className="w-full rounded-md border border-border/60 bg-background/60 px-3 py-2 font-mono text-sm outline-none focus:border-primary/60"
      />
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono text-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={100}
        step={1}
      />
    </div>
  );
}

function BigStat({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-elevated ${
        accent
          ? "border-primary/40 bg-primary/10"
          : "border-border/60 bg-card/70"
      }`}
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={`mt-2 font-mono text-3xl ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function SmallCol({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: [string, string][];
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "border-primary/40 bg-primary/5"
          : "border-border/60 bg-background/40"
      }`}
    >
      <div
        className={`text-[10px] uppercase tracking-widest ${
          accent ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {title}
      </div>
      <div className="mt-3 space-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-mono">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  width,
  tone,
}: {
  label: string;
  value: string;
  width: number;
  tone: "primary" | "muted";
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border border-border/60 bg-background/40">
        <motion.div
          initial={false}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${
            tone === "primary"
              ? "bg-gradient-to-r from-primary to-chart-2"
              : "bg-muted-foreground/40"
          }`}
        />
      </div>
    </div>
  );
}