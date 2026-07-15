import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Plus, Trash2, Ban, KeyRound, Shield, Activity, Clock, MoreHorizontal } from "lucide-react";

import { useActiveOrg } from "@/components/app-shell";
import { createKey, deleteKey, listKeys, revokeKey } from "@/lib/keys.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/keys")({
  component: KeysPage,
});

function KeysPage() {
  const { active } = useActiveOrg();
  const qc = useQueryClient();
  const listFn = useServerFn(listKeys);
  const createFn = useServerFn(createKey);
  const revokeFn = useServerFn(revokeKey);
  const deleteFn = useServerFn(deleteKey);

  const q = useQuery({
    queryKey: ["keys", active?.id],
    queryFn: () => listFn({ data: { organizationId: active!.id } }),
    enabled: !!active,
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (n: string) => createFn({ data: { organizationId: active!.id, name: n } }),
    onSuccess: (r) => {
      setFreshKey(r.plaintext);
      setName("");
      qc.invalidateQueries({ queryKey: ["keys", active?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create key"),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { keyId: id } }),
    onSuccess: () => {
      toast.success("Key revoked");
      qc.invalidateQueries({ queryKey: ["keys", active?.id] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { keyId: id } }),
    onSuccess: () => {
      toast.success("Key deleted");
      qc.invalidateQueries({ queryKey: ["keys", active?.id] });
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="text-sm text-muted-foreground">
            Use these keys as the{" "}
            <code className="font-mono text-xs">Authorization: Bearer</code> value when calling
            the proxy.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setFreshKey(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> New key
            </Button>
          </DialogTrigger>
          <DialogContent>
            {freshKey ? (
              <>
                <DialogHeader>
                  <DialogTitle>Key created</DialogTitle>
                  <DialogDescription>
                    Copy this now — you won't be able to see it again.
                  </DialogDescription>
                </DialogHeader>
                <div className="rounded-md border border-border/60 bg-background p-3 font-mono text-sm break-all">
                  {freshKey}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(freshKey);
                      toast.success("Copied");
                    }}
                  >
                    <Copy className="mr-1 h-4 w-4" /> Copy
                  </Button>
                  <Button onClick={() => setOpen(false)}>Done</Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Create API key</DialogTitle>
                  <DialogDescription>Give the key a memorable name.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="keyname">Name</Label>
                  <Input
                    id="keyname"
                    placeholder="production, staging, notebook…"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!name.trim() || createMut.isPending}
                    onClick={() => createMut.mutate(name.trim())}
                  >
                    Create
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </header>

      <div className="rounded-xl border border-border/60 bg-card/60 shadow-elevated">
        {q.data?.length ? (
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            {q.data.map((k) => {
              const revoked = !!k.revoked_at;
              return (
                <div
                  key={k.id}
                  className="group relative rounded-lg border border-border/60 bg-background/40 p-4 transition hover:border-primary/30 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border/60 bg-card">
                        <KeyRound className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{k.name}</div>
                        <div className="truncate font-mono text-[11px] text-muted-foreground">
                          {k.key_prefix}···················
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        revoked
                          ? "border-destructive/30 bg-destructive/10 text-destructive"
                          : "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${revoked ? "bg-destructive" : "bg-emerald-400"}`} />
                      {revoked ? "Revoked" : "Active"}
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                    <MetaRow icon={Clock} label="Created" value={new Date(k.created_at).toLocaleDateString()} />
                    <MetaRow
                      icon={Activity}
                      label="Last used"
                      value={k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}
                    />
                    <MetaRow icon={Shield} label="Scope" value="Full workspace" />
                    <MetaRow icon={MoreHorizontal} label="Environment" value="live" />
                  </dl>

                  <div className="mt-4 flex items-center justify-end gap-1 border-t border-border/40 pt-3">
                    {!revoked && (
                      <Button size="sm" variant="ghost" onClick={() => revokeMut.mutate(k.id)}>
                        <Ban className="mr-1 h-3.5 w-3.5" /> Revoke
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMut.mutate(k.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <KeyRound className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">No API keys yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Keys are hashed at rest — the plaintext is shown once at creation and never stored.
              Rotate freely without downtime.
            </p>
            <Button className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Create your first key
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-muted-foreground/70" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="truncate font-medium text-foreground/90">{value}</span>
    </div>
  );
}