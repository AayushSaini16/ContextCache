import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BookOpen,
  Rocket,
  ShieldCheck,
  Code2,
  Cpu,
  HelpCircle,
  Zap,
  AlertTriangle,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/docs")({
  component: DocsPage,
});

type Section = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  body: React.ReactNode;
  text: string;
};

function DocsPage() {
  const sections = useMemo<Section[]>(
    () => [
      {
        id: "getting-started",
        title: "Getting Started",
        icon: Rocket,
        text: "install create key base url first request",
        body: (
          <>
            <p>
              ContextCache is a drop-in proxy for OpenAI and Anthropic. Point your existing SDK at
              our base URL and every request gains an exact + semantic cache.
            </p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
              <li>Create an API key on the API Keys page.</li>
              <li>
                Change the base URL in your SDK to{" "}
                <code className="rounded bg-muted px-1">https://api.contextcache.dev/v1</code>.
              </li>
              <li>Send your first request — no other code changes needed.</li>
            </ol>
          </>
        ),
      },
      {
        id: "authentication",
        title: "Authentication",
        icon: ShieldCheck,
        text: "bearer token api key authorization header",
        body: (
          <>
            <p>
              Every request must include an{" "}
              <code className="rounded bg-muted px-1">Authorization: Bearer cc_live_…</code> header.
              Keys are hashed at rest and can be revoked at any time from the API Keys page.
            </p>
          </>
        ),
      },
      {
        id: "api-reference",
        title: "API Reference",
        icon: Code2,
        text: "endpoints chat completions messages",
        body: (
          <>
            <p className="mb-2">Two proxy-compatible endpoints:</p>
            <ul className="list-disc space-y-1 pl-5 text-sm font-mono">
              <li>POST /v1/chat/completions — OpenAI-compatible</li>
              <li>POST /v1/messages — Anthropic-compatible</li>
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              Responses are byte-identical to the upstream provider, with two extra headers:{" "}
              <code>x-cc-cache</code> (hit | miss | semantic) and{" "}
              <code>x-cc-similarity</code>.
            </p>
          </>
        ),
      },
      {
        id: "sdk-examples",
        title: "SDK Examples",
        icon: Zap,
        text: "openai anthropic python typescript curl",
        body: (
          <pre className="overflow-x-auto rounded-md border border-border/60 bg-background/60 p-3 text-xs">
{`// TypeScript / OpenAI
import OpenAI from "openai";
const client = new OpenAI({
  apiKey: process.env.CONTEXTCACHE_KEY,
  baseURL: "https://api.contextcache.dev/v1",
});

await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "hello" }],
});`}
          </pre>
        ),
      },
      {
        id: "architecture",
        title: "Architecture",
        icon: Cpu,
        text: "exact semantic cache pgvector redis proxy",
        body: (
          <p>
            Requests hit an exact-match lookup first (Redis), then a pgvector semantic search
            scoped by workspace. Misses fall through to the upstream provider and are written
            back to both layers with your configured TTL.
          </p>
        ),
      },
      {
        id: "error-codes",
        title: "Error Codes",
        icon: AlertTriangle,
        text: "401 403 429 500 unauthorized rate limit",
        body: (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li><b>401</b> — missing or invalid API key</li>
            <li><b>403</b> — key revoked or workspace suspended</li>
            <li><b>429</b> — rate limited; back off and retry</li>
            <li><b>5xx</b> — upstream provider error; passed through as-is</li>
          </ul>
        ),
      },
      {
        id: "faq",
        title: "FAQ",
        icon: HelpCircle,
        text: "questions cache freshness cost",
        body: (
          <div className="space-y-3 text-sm">
            <div>
              <b>Does caching change my model's behavior?</b>
              <p className="text-muted-foreground">
                No. Cache hits return the original provider response verbatim.
              </p>
            </div>
            <div>
              <b>How do I disable caching for a request?</b>
              <p className="text-muted-foreground">
                Send the header <code>x-cc-cache: bypass</code>.
              </p>
            </div>
          </div>
        ),
      },
    ],
    [],
  );

  const [q, setQ] = useState("");
  const filtered = sections.filter(
    (s) =>
      !q.trim() ||
      s.title.toLowerCase().includes(q.toLowerCase()) ||
      s.text.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-8">
      <header>
        <div className="mb-1 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Documentation</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Everything you need to integrate ContextCache. Press{" "}
          <kbd className="rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[10px]">
            ⌘K
          </kbd>{" "}
          to jump anywhere.
        </p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search documentation"
          className="pl-9"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((s) => (
          <article
            key={s.id}
            id={s.id}
            className="rounded-xl border border-border/60 bg-card/60 p-5 shadow-elevated"
          >
            <div className="mb-2 flex items-center gap-2">
              <s.icon className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">{s.title}</h2>
            </div>
            <div className="text-sm text-muted-foreground [&_code]:font-mono [&_code]:text-xs [&_code]:text-foreground">
              {s.body}
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-sm text-muted-foreground">
            No docs matched "{q}".
          </p>
        )}
      </div>
    </div>
  );
}