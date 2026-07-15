import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useActiveOrg } from "@/components/app-shell";
import { getOrgSettings, updateOrgSettings } from "@/lib/orgs.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { active } = useActiveOrg();
  const qc = useQueryClient();
  const getFn = useServerFn(getOrgSettings);
  const updateFn = useServerFn(updateOrgSettings);

  const q = useQuery({
    queryKey: ["settings", active?.id],
    queryFn: () => getFn({ data: { organizationId: active!.id } }),
    enabled: !!active,
  });

  const [threshold, setThreshold] = useState(0.95);
  const [ttl, setTtl] = useState(3600);
  const [semantic, setSemantic] = useState(true);
  const [exact, setExact] = useState(true);

  useEffect(() => {
    if (!q.data) return;
    setThreshold(q.data.similarity_threshold);
    setTtl(q.data.cache_ttl_seconds);
    setSemantic(q.data.semantic_cache_enabled);
    setExact(q.data.exact_cache_enabled);
  }, [q.data]);

  const mut = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          organizationId: active!.id,
          similarity_threshold: threshold,
          cache_ttl_seconds: ttl,
          semantic_cache_enabled: semantic,
          exact_cache_enabled: exact,
        },
      }),
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["settings", active?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Cache behavior for the <span className="text-foreground">{active?.name}</span> workspace.
        </p>
      </header>

      <section className="space-y-6 rounded-xl border border-border/60 bg-card/60 p-6 shadow-elevated">
        <SettingRow
          title="Exact cache"
          desc="Return cached responses when a request is byte-identical to a previous one."
        >
          <Switch checked={exact} onCheckedChange={setExact} />
        </SettingRow>

        <SettingRow
          title="Semantic cache"
          desc="Use pgvector similarity search to reuse responses to semantically similar prompts."
        >
          <Switch checked={semantic} onCheckedChange={setSemantic} />
        </SettingRow>

        <SettingRow
          title="Similarity threshold"
          desc={`Semantic hit requires cosine similarity ≥ ${threshold.toFixed(2)}. Higher = safer, lower = more hits.`}
        >
          <div className="w-64 space-y-2">
            <Slider
              min={0.7}
              max={1}
              step={0.01}
              value={[threshold]}
              onValueChange={([v]) => setThreshold(v)}
              disabled={!semantic}
            />
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>More hits</span>
              <span className="font-mono normal-case tracking-normal text-foreground">
                {threshold.toFixed(2)}
              </span>
              <span>Safer</span>
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Lower values recycle more responses but risk false matches. Higher values only reuse near-identical prompts.
            </p>
          </div>
        </SettingRow>

        <SettingRow
          title="Cache TTL (seconds)"
          desc="How long cached responses remain valid. 0 = never expire."
        >
          <div className="w-56 space-y-2">
            <Input
              type="number"
              min={0}
              className="w-full"
              value={ttl}
              onChange={(e) => setTtl(Number(e.target.value) || 0)}
            />
            <div className="flex flex-wrap gap-1">
              {[
                { l: "5m", v: 300 },
                { l: "1h", v: 3600 },
                { l: "1d", v: 86400 },
                { l: "7d", v: 604800 },
                { l: "∞", v: 0 },
              ].map((p) => (
                <button
                  key={p.l}
                  type="button"
                  onClick={() => setTtl(p.v)}
                  className={`rounded-md border px-2 py-0.5 text-[11px] transition ${
                    ttl === p.v
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {p.l}
                </button>
              ))}
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Shorter TTL keeps responses fresh; longer TTL maximizes cost savings for stable prompts.
            </p>
          </div>
        </SettingRow>

        <div className="flex justify-end">
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !q.data}>
            Save changes
          </Button>
        </div>
      </section>
    </div>
  );
}

function SettingRow({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/40 pb-6 last:border-b-0 last:pb-0 md:flex-row md:items-center md:justify-between">
      <div className="max-w-lg">
        <Label className="text-sm font-medium">{title}</Label>
        <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}