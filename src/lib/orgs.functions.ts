import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || "workspace";
}

export const listMyOrgs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;

    const { data: memberships, error } = await supabase
      .from("organization_members")
      .select("role, organization:organizations(id, name, slug, created_at)")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    let rows =
      memberships
        ?.filter((m) => m.organization)
        .map((m) => ({
          id: m.organization!.id,
          name: m.organization!.name,
          slug: m.organization!.slug,
          role: m.role as string,
          created_at: m.organization!.created_at as string,
        }))
        .sort((a, b) => a.created_at.localeCompare(b.created_at)) ?? [];

    if (rows.length === 0) {
      const email = (claims as { email?: string } | null)?.email ?? "workspace";
      const base = slugify(email.split("@")[0] ?? "workspace");
      const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

      const { data: created, error: createErr } = await supabase
        .from("organizations")
        .insert({ name: "Personal", slug, created_by: userId })
        .select("id, name, slug, created_at")
        .single();
      if (createErr) throw new Error(createErr.message);

      rows = [
        {
          id: created!.id,
          name: created!.name,
          slug: created!.slug,
          role: "owner",
          created_at: created!.created_at as string,
        },
      ];
    }
    return rows;
  });

export const createOrg = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ name: z.string().trim().min(1).max(60) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const slug = `${slugify(data.name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: created, error } = await supabase
      .from("organizations")
      .insert({ name: data.name, slug, created_by: userId })
      .select("id, name, slug, created_at")
      .single();
    if (error) throw new Error(error.message);
    return created!;
  });

export const getOrgSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ organizationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("org_settings")
      .select("similarity_threshold, cache_ttl_seconds, semantic_cache_enabled, exact_cache_enabled")
      .eq("organization_id", data.organizationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (
      row ?? {
        similarity_threshold: 0.95,
        cache_ttl_seconds: 3600,
        semantic_cache_enabled: true,
        exact_cache_enabled: true,
      }
    );
  });

export const updateOrgSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        organizationId: z.string().uuid(),
        similarity_threshold: z.number().min(0.5).max(1),
        cache_ttl_seconds: z.number().int().min(0).max(60 * 60 * 24 * 30),
        semantic_cache_enabled: z.boolean(),
        exact_cache_enabled: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { organizationId, ...patch } = data;
    const { error } = await supabase
      .from("org_settings")
      .upsert({ organization_id: organizationId, ...patch });
    if (error) throw new Error(error.message);
    return { ok: true };
  });