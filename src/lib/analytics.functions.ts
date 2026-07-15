import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        organizationId: z.string().uuid(),
        days: z.number().int().min(1).max(90).default(7),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const since = new Date(Date.now() - data.days * 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await supabase
      .from("requests")
      .select(
        "created_at, cache_status, cost_usd, cost_saved_usd, total_tokens, latency_ms, provider, model",
      )
      .eq("organization_id", data.organizationId)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(10000);
    if (error) throw new Error(error.message);

    const list = rows ?? [];
    const total = list.length;
    const hits = list.filter(
      (r) => r.cache_status === "exact_hit" || r.cache_status === "semantic_hit",
    ).length;
    const hitRate = total > 0 ? hits / total : 0;
    const costUsd = list.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
    const costSaved = list.reduce((s, r) => s + Number(r.cost_saved_usd ?? 0), 0);
    const totalTokens = list.reduce((s, r) => s + (r.total_tokens ?? 0), 0);
    const avgLatency =
      total > 0
        ? Math.round(list.reduce((s, r) => s + (r.latency_ms ?? 0), 0) / total)
        : 0;

    const buckets = new Map<
      string,
      { day: string; requests: number; hits: number; cost: number; saved: number }
    >();
    for (const r of list) {
      const day = r.created_at.slice(0, 10);
      const b = buckets.get(day) ?? { day, requests: 0, hits: 0, cost: 0, saved: 0 };
      b.requests += 1;
      if (r.cache_status !== "miss") b.hits += 1;
      b.cost += Number(r.cost_usd ?? 0);
      b.saved += Number(r.cost_saved_usd ?? 0);
      buckets.set(day, b);
    }
    const daily = Array.from(buckets.values()).sort((a, b) => a.day.localeCompare(b.day));
    const recent = list.slice(-25).reverse();

    return { total, hits, hitRate, costUsd, costSaved, totalTokens, avgLatency, daily, recent };
  });