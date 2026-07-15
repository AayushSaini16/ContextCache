import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Boxes,
  Building2,
  Cpu,
  Database,
  Gauge,
  KeyRound,
  LineChart,
  Repeat,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";

const DX = [
  { icon: Terminal, title: "One-line integration", body: "Point your existing SDK at ContextCache." },
  { icon: Zap, title: "Drop-in OpenAI compat", body: "Same request and response shape. No rewrite." },
  { icon: Sparkles, title: "Semantic cache", body: "Match rephrasings via embedding similarity." },
  { icon: Repeat, title: "Provider-agnostic", body: "OpenAI and Anthropic behind one endpoint." },
  { icon: LineChart, title: "Real-time analytics", body: "Cost, hit rate, latency — live." },
  { icon: Building2, title: "Organizations", body: "Multi-tenant workspaces with scoped keys." },
  { icon: KeyRound, title: "API keys", body: "Hashed at rest. Revoke and rotate anytime." },
  { icon: Cpu, title: "FastAPI powered", body: "Async Python core built for concurrency." },
  { icon: Database, title: "Redis + pgvector", body: "Two-tier cache that beats every LLM RTT." },
  { icon: Gauge, title: "Low latency", body: "Sub-10ms hits. <150ms p50 end-to-end." },
  { icon: Boxes, title: "Structured logs", body: "Every request tagged, searchable, exportable." },
  { icon: Terminal, title: "Great DX", body: "Copy-paste snippets and a live playground." },
];

export function DeveloperExperience() {
  return (
    <section className="border-t border-border/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Why developers love ContextCache
          </h2>
          <p className="mt-3 text-muted-foreground">
            Built by people who ship. Every detail defaults to the boring,
            correct thing.
          </p>
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DX.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border/60 bg-card/60 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card"
            >
              <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary transition group-hover:bg-primary/20">
                <f.icon className="h-4 w-4" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCounter({
  value,
  suffix,
  duration = 1400,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [d, setD] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setD(value * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);
  const display =
    value >= 1000
      ? Math.round(d).toLocaleString()
      : Number.isInteger(value)
        ? Math.round(d).toString()
        : d.toFixed(1);
  return (
    <span ref={ref} className="font-mono">
      {display}
      {suffix}
    </span>
  );
}

export function ProductMetrics() {
  return (
    <section className="border-t border-border/40 bg-card/20">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-8 md:grid-cols-4">
          <MetricCard label="Average cached latency" value={<><StatCounter value={150} />ms</>} prefix="<" />
          <MetricCard label="Average cost reduction" value={<StatCounter value={70} suffix="%" />} />
          <MetricCard label="Availability target" value={<StatCounter value={99.9} suffix="%" />} />
          <MetricCard label="Requests supported" value="Millions" />
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  prefix,
}: {
  label: string;
  value: React.ReactNode;
  prefix?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-elevated"
    >
      <div className="text-3xl font-semibold tracking-tight md:text-4xl">
        {prefix}
        {value}
      </div>
      <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </motion.div>
  );
}

const FAQ_ITEMS = [
  {
    q: "What is semantic caching?",
    a: "Instead of only matching identical prompts, we embed each prompt into a vector and search pgvector for near-matches above a similarity threshold you control. Great for FAQs, support bots, and repeatable RAG queries.",
  },
  {
    q: "How much money can I save?",
    a: "It depends on how repetitive your traffic is. Teams with FAQ-style workloads routinely see 60–90% cost reductions. Use the calculator above with your own numbers.",
  },
  {
    q: "Does it work with OpenAI?",
    a: "Yes — ContextCache exposes the OpenAI Chat Completions API 1:1. Point your existing SDK at our base URL and everything works.",
  },
  {
    q: "Does it work with Anthropic?",
    a: "Yes — the Anthropic Messages API is supported natively. Use the official Anthropic SDK with our base URL.",
  },
  {
    q: "How secure are API keys?",
    a: "Keys are shown only once on creation and stored as SHA-256 hashes. You can rotate or revoke instantly. Requests are scoped to the owning workspace.",
  },
  {
    q: "Can I disable semantic caching?",
    a: "Yes — semantic and exact caching are independent toggles per workspace, with configurable TTLs and similarity thresholds.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-24 border-t border-border/40">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <div className="text-center">
          <div className="font-mono text-xs tracking-widest text-primary">FAQ</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Everything you were about to ask.
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-10">
          {FAQ_ITEMS.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}