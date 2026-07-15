import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, X, KeyRound, Rocket, Terminal, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listKeys } from "@/lib/keys.functions";
import { getDashboardStats } from "@/lib/analytics.functions";
import { useActiveOrg } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

const KEY = "cc:onboardingDismissed";

export function OnboardingChecklist() {
  const { active } = useActiveOrg();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem(KEY) === "1");
    }
  }, []);

  const keysFn = useServerFn(listKeys);
  const statsFn = useServerFn(getDashboardStats);
  const keysQ = useQuery({
    queryKey: ["keys", active?.id],
    queryFn: () => keysFn({ data: { organizationId: active!.id } }),
    enabled: !!active,
  });
  const statsQ = useQuery({
    queryKey: ["stats", active?.id],
    queryFn: () => statsFn({ data: { organizationId: active!.id, days: 7 } }),
    enabled: !!active,
  });

  const hasOrg = !!active;
  const hasKey = (keysQ.data?.length ?? 0) > 0;
  const hasRequest = (statsQ.data?.total ?? 0) > 0;
  const done = hasOrg && hasKey && hasRequest;

  if (dismissed || done) return null;

  const steps = [
    { done: hasOrg, label: "Create a workspace", icon: Activity, cta: null },
    { done: hasKey, label: "Generate an API key", icon: KeyRound, cta: { to: "/keys", label: "Create key" } },
    { done: hasKey && !hasRequest, label: "Copy the integration snippet", icon: Terminal, cta: { to: "/quickstart", label: "View snippet" } },
    { done: hasRequest, label: "Make your first request", icon: Rocket, cta: { to: "/quickstart", label: "Quickstart" } },
  ];
  const completed = steps.filter((s) => s.done).length;

  function dismiss() {
    localStorage.setItem(KEY, "1");
    setDismissed(true);
  }

  return (
    <section className="relative rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] via-card/60 to-card/60 p-6 shadow-elevated">
      <button
        onClick={dismiss}
        aria-label="Dismiss onboarding"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-tight">Get started with ContextCache</h2>
        <p className="text-xs text-muted-foreground">
          {completed} of {steps.length} steps complete · takes about 2 minutes
        </p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(completed / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-background/40 px-3 py-2"
          >
            <div className="flex items-center gap-3">
              {s.done ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={`text-sm ${s.done ? "text-muted-foreground line-through" : ""}`}>
                {s.label}
              </span>
            </div>
            {!s.done && s.cta && (
              <Button size="sm" variant="outline" asChild>
                <Link to={s.cta.to as never}>{s.cta.label}</Link>
              </Button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}