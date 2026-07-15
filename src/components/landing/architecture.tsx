import { useState } from "react";
import { motion } from "framer-motion";
import { Boxes, Database, Server, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Node = {
  id: string;
  label: string;
  detail: string;
  icon: typeof Zap;
  x: number;
  y: number;
};

const NODES: Node[] = [
  { id: "app", label: "Your app", detail: "Any client using an OpenAI or Anthropic SDK.", icon: Boxes, x: 8, y: 45 },
  { id: "cc", label: "ContextCache", detail: "FastAPI gateway. Auth, routing, caching, logging.", icon: Server, x: 34, y: 45 },
  { id: "redis", label: "Redis", detail: "Exact cache. Sub-10ms lookups keyed by prompt hash.", icon: Database, x: 60, y: 15 },
  { id: "pg", label: "pgvector", detail: "Semantic cache. Nearest-neighbour embedding search.", icon: Sparkles, x: 60, y: 75 },
  { id: "prov", label: "Providers", detail: "OpenAI + Anthropic upstream. Called only on miss.", icon: Zap, x: 86, y: 45 },
];

const EDGES: [string, string][] = [
  ["app", "cc"],
  ["cc", "redis"],
  ["cc", "pg"],
  ["cc", "prov"],
];

export function Architecture() {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <section className="border-t border-border/40 bg-card/20">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="font-mono text-xs tracking-widest text-primary">
            ARCHITECTURE
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Simple stack. Serious throughput.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every request flows through the same predictable path. Hover a node
            to see what it does.
          </p>
        </div>

        <div className="mt-12 rounded-2xl border border-border/60 bg-card/70 p-6 shadow-elevated">
          <div className="relative h-[360px] w-full">
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {EDGES.map(([a, b], i) => {
                const na = NODES.find((n) => n.id === a)!;
                const nb = NODES.find((n) => n.id === b)!;
                return (
                  <g key={i}>
                    <line
                      x1={na.x}
                      y1={na.y}
                      x2={nb.x}
                      y2={nb.y}
                      stroke="currentColor"
                      strokeOpacity={0.25}
                      strokeWidth={0.3}
                      className="text-muted-foreground"
                      vectorEffect="non-scaling-stroke"
                    />
                    <motion.circle
                      r={0.9}
                      fill="currentColor"
                      className="text-primary"
                      animate={{
                        cx: [na.x, nb.x],
                        cy: [na.y, nb.y],
                      }}
                      transition={{
                        duration: 2.4,
                        delay: i * 0.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </g>
                );
              })}
            </svg>
            {NODES.map((n) => {
              const Icon = n.icon;
              const isHover = hover === n.id;
              return (
                <button
                  key={n.id}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                >
                  <motion.div
                    animate={{ scale: isHover ? 1.05 : 1 }}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-elevated backdrop-blur transition-colors",
                      isHover
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border/60 bg-card/80 text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{n.label}</span>
                  </motion.div>
                  {isHover && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute left-1/2 top-full mt-2 w-56 -translate-x-1/2 rounded-md border border-border/60 bg-popover p-3 text-xs text-muted-foreground shadow-elevated"
                    >
                      {n.detail}
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}