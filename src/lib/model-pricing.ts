// Per-1K token pricing (USD). Kept modular so it's easy to update.
export type ModelPricing = {
  id: string;
  label: string;
  provider: "OpenAI" | "Anthropic";
  inputPer1k: number;
  outputPer1k: number;
  avgLatencyMs: number; // typical uncached latency
};

export const MODELS: ModelPricing[] = [
  { id: "gpt-4.1", label: "GPT-4.1", provider: "OpenAI", inputPer1k: 0.005, outputPer1k: 0.015, avgLatencyMs: 1900 },
  { id: "gpt-4o", label: "GPT-4o", provider: "OpenAI", inputPer1k: 0.005, outputPer1k: 0.015, avgLatencyMs: 1800 },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI", inputPer1k: 0.00015, outputPer1k: 0.0006, avgLatencyMs: 900 },
  { id: "claude-sonnet", label: "Claude Sonnet", provider: "Anthropic", inputPer1k: 0.003, outputPer1k: 0.015, avgLatencyMs: 2100 },
  { id: "claude-opus", label: "Claude Opus", provider: "Anthropic", inputPer1k: 0.015, outputPer1k: 0.075, avgLatencyMs: 3200 },
];

export const CACHED_LATENCY_MS = 120;

export function calcSavings(opts: {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  modelId: string;
  hitRate: number; // 0..1
}) {
  const m = MODELS.find((x) => x.id === opts.modelId) ?? MODELS[0];
  const perCallCost =
    (opts.inputTokens / 1000) * m.inputPer1k +
    (opts.outputTokens / 1000) * m.outputPer1k;
  const baselineCost = perCallCost * opts.requests;
  const providerCalls = Math.round(opts.requests * (1 - opts.hitRate));
  const cacheHits = opts.requests - providerCalls;
  const withCost = perCallCost * providerCalls;
  const monthlySaved = baselineCost - withCost;
  const annualSaved = monthlySaved * 12;
  const baselineLatency = m.avgLatencyMs;
  const withLatency =
    m.avgLatencyMs * (1 - opts.hitRate) + CACHED_LATENCY_MS * opts.hitRate;
  const latencyReductionPct =
    baselineLatency > 0 ? (1 - withLatency / baselineLatency) * 100 : 0;
  const costReductionPct =
    baselineCost > 0 ? (monthlySaved / baselineCost) * 100 : 0;
  const tokensSaved = cacheHits * (opts.inputTokens + opts.outputTokens);
  return {
    model: m,
    baselineCost,
    withCost,
    monthlySaved,
    annualSaved,
    baselineLatency,
    withLatency,
    latencyReductionPct,
    costReductionPct,
    providerCalls,
    cacheHits,
    tokensSaved,
  };
}