import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Check, Terminal, KeyRound, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/quickstart")({
  component: QuickstartPage,
});

const PROXY_URL = "https://api.contextcache.dev/v1";

function CodeBlock({ code, id }: { code: string; id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md border border-border/60 bg-muted/40 p-4 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute right-2 top-2 h-7 px-2"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        aria-label={`Copy ${id}`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function QuickstartPage() {
  const py = `from openai import OpenAI

client = OpenAI(
    api_key="YOUR_CONTEXTCACHE_KEY",
    base_url="${PROXY_URL}",
)

resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Explain vector databases"}],
)
print(resp.choices[0].message.content)`;

  const ts = `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.CONTEXTCACHE_API_KEY,
  baseURL: "${PROXY_URL}",
});

const res = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Explain vector databases" }],
});`;

  const curl = `curl ${PROXY_URL}/chat/completions \\
  -H "Authorization: Bearer YOUR_CONTEXTCACHE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role":"user","content":"Explain vector databases"}]
  }'`;

  const anthropic = `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.CONTEXTCACHE_API_KEY,
  baseURL: "${PROXY_URL.replace("/v1", "")}",
});

const msg = await client.messages.create({
  model: "claude-3-5-sonnet-latest",
  max_tokens: 512,
  messages: [{ role: "user", content: "Explain vector databases" }],
});`;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Quickstart</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Point any OpenAI or Anthropic SDK at ContextCache — no code changes beyond the base URL.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StepCard icon={KeyRound} step="1" title="Create an API key">
          Head to <span className="font-medium text-foreground">API Keys</span> and generate a
          <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">cc_live_…</code>
          token. Store it in your app as
          <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">CONTEXTCACHE_API_KEY</code>.
        </StepCard>
        <StepCard icon={Terminal} step="2" title="Swap the base URL">
          Change your OpenAI/Anthropic client base URL to
          <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">{PROXY_URL}</code>. That's it —
          the request and response shapes are unchanged.
        </StepCard>
        <StepCard icon={Rocket} step="3" title="Ship it">
          Repeat and semantically-similar prompts return from cache in&nbsp;milliseconds. Watch cost
          and hit rate live on the Dashboard.
        </StepCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Make your first call</CardTitle>
          <CardDescription>Copy, paste your key, and run.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="ts">
            <TabsList>
              <TabsTrigger value="ts">TypeScript</TabsTrigger>
              <TabsTrigger value="py">Python</TabsTrigger>
              <TabsTrigger value="curl">curl</TabsTrigger>
              <TabsTrigger value="anthropic">Anthropic</TabsTrigger>
            </TabsList>
            <TabsContent value="ts"><CodeBlock code={ts} id="ts" /></TabsContent>
            <TabsContent value="py"><CodeBlock code={py} id="py" /></TabsContent>
            <TabsContent value="curl"><CodeBlock code={curl} id="curl" /></TabsContent>
            <TabsContent value="anthropic"><CodeBlock code={anthropic} id="anthropic" /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How caching works</CardTitle>
          <CardDescription>Two layers, one endpoint.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Exact cache</span> — identical prompts
            (same model, messages, temperature) return instantly from Redis. Configurable TTL per
            workspace.
          </p>
          <p>
            <span className="font-medium text-foreground">Semantic cache</span> — we embed the
            prompt and look for a vector match above your similarity threshold. Great for FAQs,
            support bots, and RAG.
          </p>
          <p>
            <span className="font-medium text-foreground">Miss</span> — we forward the request to
            the upstream provider, return the response, and store it for next time.
          </p>
          <p>
            Every response carries the same shape as the upstream API. Configure thresholds, TTL,
            and which layers are active under <span className="font-medium text-foreground">Settings</span>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supported models</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <div className="font-medium text-foreground">OpenAI</div>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              <li>gpt-4o, gpt-4o-mini</li>
              <li>gpt-4-turbo, gpt-4.1, gpt-4.1-mini</li>
              <li>o1, o3, o3-mini</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-foreground">Anthropic</div>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              <li>claude-3-5-sonnet-latest</li>
              <li>claude-3-5-haiku-latest</li>
              <li>claude-3-opus-latest</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StepCard({
  icon: Icon,
  step,
  title,
  children,
}: {
  icon: typeof KeyRound;
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-xs font-mono text-muted-foreground">Step {step}</span>
        </div>
        <CardTitle className="mt-2 text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}