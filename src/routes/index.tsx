import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Playground } from "@/components/landing/playground";
import { Calculator } from "@/components/landing/calculator";
import { Architecture } from "@/components/landing/architecture";
import {
  DeveloperExperience,
  ProductMetrics,
  FAQ,
} from "@/components/landing/extras";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ContextCache — Intelligent caching for LLM applications" },
      {
        name: "description",
        content:
          "Drop-in caching layer for OpenAI and Anthropic. Cut LLM costs up to 90% and slash latency with exact and semantic caching.",
      },
      { property: "og:title", content: "ContextCache — Intelligent caching for LLM apps" },
      {
        property: "og:description",
        content:
          "Drop-in caching layer for OpenAI and Anthropic. Save up to 90% on LLM costs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const codeExample = `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.CONTEXTCACHE_API_KEY,
  baseURL: "https://api.contextcache.dev/v1",
});

// Same call. Now cached, cheaper, faster.
const res = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Explain vector databases" }],
});`;

const SECTIONS = [
  { id: "how", label: "How it works" },
  { id: "calculator", label: "Calculator" },
  { id: "faq", label: "FAQ" },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <LogosBand />
        <Playground />
        <Calculator />
        <Architecture />
        <DeveloperExperience />
        <ProductMetrics />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean
    ) as HTMLElement[];
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const smooth = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all",
        scrolled
          ? "border-b border-border/60 bg-background/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <LogoMark />
          <span>ContextCache</span>
        </Link>
        <nav className="hidden gap-1 text-sm md:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={smooth(s.id)}
              className={cn(
                "rounded-md px-3 py-1.5 transition",
                active === s.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </a>
          ))}
          <Link
            to="/quickstart"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:text-foreground"
          >
            Docs
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth" search={{ mode: "signup" }}>
              Start free <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function LogoMark() {
  return (
    <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground shadow-elevated">
      <Zap className="h-4 w-4" strokeWidth={2.5} />
    </div>
  );
}

function Hero() {
  const smooth = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <section className="bg-hero relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <Badge
            variant="secondary"
            className="mb-6 gap-1.5 border-border/60 bg-card/60"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Now in public beta
          </Badge>
          <h1 className="text-balance text-5xl font-semibold tracking-tight md:text-6xl">
            The intelligent caching layer for{" "}
            <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              LLM applications
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Drop-in replacement for the OpenAI &amp; Anthropic APIs. Exact and
            semantic caching cut your bill by up to 90% and shave hundreds of
            milliseconds off every call.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start caching — free
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              onClick={smooth("how")}
            >
              <a href="#how">See how it works</a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card. 100k free requests per month.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-auto mt-16 max-w-3xl"
        >
          <div className="rounded-xl border border-border/60 bg-card/80 shadow-elevated backdrop-blur">
            <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              <span className="ml-3 font-mono text-xs text-muted-foreground">
                index.ts
              </span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-foreground/90">
              <code>{codeExample}</code>
            </pre>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function LogosBand() {
  const items = ["OpenAI", "Anthropic", "Google", "Mistral", "Cohere", "Groq"];
  return (
    <section className="border-y border-border/40 bg-card/30">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-12 gap-y-3 px-6 py-8 text-sm text-muted-foreground">
        <span className="mr-2 text-xs uppercase tracking-widest text-muted-foreground/70">
          One API, every provider
        </span>
        {items.map((n) => (
          <span key={n} className="font-medium">
            {n}
          </span>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="border-t border-border/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-10 text-center shadow-elevated md:p-16">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Ship faster. Spend less.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Free forever for the first 100k cached requests each month. No
            credit card.
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create your account
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const cols: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: "Product",
      links: [
        { label: "Documentation", href: "/quickstart" },
        { label: "API Reference", href: "/quickstart" },
        { label: "Roadmap", href: "#" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "GitHub", href: "https://github.com" },
        { label: "Status", href: "#" },
        { label: "Contact", href: "mailto:hello@contextcache.dev" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy", href: "#" },
        { label: "Terms", href: "#" },
      ],
    },
  ];
  return (
    <footer className="border-t border-border/40 bg-card/30">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 font-semibold">
              <LogoMark />
              <span>ContextCache</span>
            </div>
            <p className="mt-3 max-w-xs text-xs text-muted-foreground">
              The intelligent caching layer for LLM applications. Drop-in,
              provider-agnostic, production-ready.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {c.title}
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-border/40 pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} ContextCache. All rights reserved.</span>
          <span className="font-mono">api.contextcache.dev</span>
        </div>
      </div>
    </footer>
  );
}
