import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LayoutDashboard, KeyRound, Settings, LogOut, Zap, ChevronDown, Rocket, BookOpen, Command as CommandIcon, Activity } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { listMyOrgs } from "@/lib/orgs.functions";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/command-palette";
import { FeedbackButton } from "@/components/feedback-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STORAGE_KEY = "cc:activeOrgId";

export function useActiveOrg() {
  const listMyOrgsFn = useServerFn(listMyOrgs);
  const query = useQuery({
    queryKey: ["orgs"],
    queryFn: () => listMyOrgsFn(),
    staleTime: 30_000,
  });
  const [activeId, setActiveId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEY),
  );
  useEffect(() => {
    if (!query.data?.length) return;
    if (!activeId || !query.data.find((o) => o.id === activeId)) {
      const next = query.data[0].id;
      setActiveId(next);
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, next);
    }
  }, [query.data, activeId]);

  function setActive(id: string) {
    setActiveId(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  }

  const active = query.data?.find((o) => o.id === activeId) ?? query.data?.[0] ?? null;
  return { orgs: query.data ?? [], active, setActive, isLoading: query.isLoading };
}

export function AppShell({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string>("");
  const navigate = useNavigate();
  const { pathname } = useRouterState({ select: (s) => s.location });
  const { orgs, active, setActive, isLoading } = useActiveOrg();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = [
    { to: "/dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { to: "/quickstart" as const, label: "Quickstart", icon: Rocket },
    { to: "/keys" as const, label: "API Keys", icon: KeyRound },
    { to: "/docs" as const, label: "Docs", icon: BookOpen },
    { to: "/status" as const, label: "Status", icon: Activity },
    { to: "/settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border/60 px-5">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight">ContextCache</span>
        </div>

        <div className="px-3 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-md border border-border/60 bg-card px-3 py-2 text-left text-sm hover:border-border">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {isLoading ? "Loading…" : (active?.name ?? "No workspace")}
                  </div>
                  {active && (
                    <div className="truncate text-xs text-muted-foreground">{active.role}</div>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              {orgs.map((o) => (
                <DropdownMenuItem key={o.id} onClick={() => setActive(o.id)}>
                  <span className="truncate">{o.name}</span>
                  {o.id === active?.id && (
                    <span className="ml-auto text-xs text-primary">active</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {nav.map((n) => {
            const isActive = pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/60 p-3">
          <button
            onClick={() => {
              const e = new KeyboardEvent("keydown", { key: "k", metaKey: true });
              window.dispatchEvent(e);
            }}
            className="mb-3 flex w-full items-center justify-between rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5 text-xs text-muted-foreground hover:border-border hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <CommandIcon className="h-3.5 w-3.5" />
              Quick search
            </span>
            <kbd className="rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[10px]">
              ⌘K
            </kbd>
          </button>
          <div className="flex items-center justify-between">
            <div className="min-w-0 truncate text-sm">{email || "…"}</div>
            <Button size="icon" variant="ghost" onClick={handleSignOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
      <CommandPalette />
      <FeedbackButton />
    </div>
  );
}