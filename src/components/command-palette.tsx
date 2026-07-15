import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  KeyRound,
  Rocket,
  Settings,
  BookOpen,
  LogOut,
  Zap,
  Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(to: string) {
    setOpen(false);
    navigate({ to: to as never });
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search actions, pages, docs…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/dashboard")}>
            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/keys")}>
            <KeyRound className="mr-2 h-4 w-4" /> API Keys
          </CommandItem>
          <CommandItem onSelect={() => go("/quickstart")}>
            <Rocket className="mr-2 h-4 w-4" /> Quickstart
          </CommandItem>
          <CommandItem onSelect={() => go("/docs")}>
            <BookOpen className="mr-2 h-4 w-4" /> Documentation
          </CommandItem>
          <CommandItem onSelect={() => go("/status")}>
            <Activity className="mr-2 h-4 w-4" /> System Status
          </CommandItem>
          <CommandItem onSelect={() => go("/settings")}>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("/keys")}>
            <Zap className="mr-2 h-4 w-4" /> Create API Key
          </CommandItem>
          <CommandItem
            onSelect={async () => {
              setOpen(false);
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}