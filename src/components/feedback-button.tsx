import { useState } from "react";
import { MessageSquarePlus, Bug, Sparkles, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Kind = "bug" | "feature" | "contact";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("feature");
  const [text, setText] = useState("");

  function submit() {
    if (!text.trim()) return;
    // Client-only capture — persists locally so it isn't lost.
    try {
      const key = "cc:feedback";
      const prev = JSON.parse(localStorage.getItem(key) ?? "[]");
      prev.push({ kind, text, at: new Date().toISOString(), url: location.pathname });
      localStorage.setItem(key, JSON.stringify(prev));
    } catch {}
    toast.success("Thanks — feedback recorded");
    setText("");
    setOpen(false);
  }

  function copyDebug() {
    const info = {
      ua: navigator.userAgent,
      url: location.href,
      time: new Date().toISOString(),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };
    navigator.clipboard.writeText(JSON.stringify(info, null, 2));
    toast.success("Debug info copied");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Send feedback"
          className="fixed bottom-5 right-5 z-40 flex h-11 items-center gap-2 rounded-full border border-border/60 bg-card px-4 text-sm shadow-elevated hover:border-primary/40 hover:bg-card/80"
        >
          <MessageSquarePlus className="h-4 w-4 text-primary" />
          Feedback
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="mb-2 flex gap-1">
          <TabBtn active={kind === "bug"} onClick={() => setKind("bug")} icon={Bug} label="Bug" />
          <TabBtn active={kind === "feature"} onClick={() => setKind("feature")} icon={Sparkles} label="Idea" />
          <TabBtn active={kind === "contact"} onClick={() => setKind("contact")} icon={Mail} label="Contact" />
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            kind === "bug"
              ? "What went wrong? Steps to reproduce?"
              : kind === "feature"
                ? "What would make ContextCache better?"
                : "How can we help?"
          }
          rows={4}
          className="text-sm"
        />
        <div className="mt-2 flex items-center justify-between">
          <Button size="sm" variant="ghost" onClick={copyDebug}>
            Copy debug info
          </Button>
          <Button size="sm" onClick={submit} disabled={!text.trim()}>
            Send
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition ${
        active
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-border/50 text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}