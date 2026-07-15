# ContextCache

The intelligent caching layer for LLM applications.

This repo contains two deployables:

| Path | What it is | Where it runs |
| ---- | ---------- | ------------- |
| `./` (root) | Marketing site + dashboard (TanStack Start + React) | Lovable Cloud |
| `./proxy` | FastAPI proxy: auth, cache engine, provider router | Your own infra (Docker, Fly, Railway, ECS…) |

Both share a single Postgres (with `pgvector`) as source of truth. The
dashboard is read-mostly; the proxy is the write path.

## Repo layout

```
src/                          Dashboard app
  routes/
    index.tsx                 Landing page
    auth.tsx                  Sign in / sign up (email + Google)
    _authenticated/
      route.tsx               Session gate
      dashboard.tsx           Overview + charts + recent requests
      keys.tsx                API key management
      settings.tsx            Similarity threshold, TTL, cache toggles
  lib/
    orgs.functions.ts         Org list/create + settings
    keys.functions.ts         Create/revoke/delete API keys
    analytics.functions.ts    Aggregated dashboard stats
  components/app-shell.tsx    Sidebar, org switcher, sign-out

supabase/migrations/          Schema: profiles, organizations,
                              organization_members, api_keys, org_settings,
                              requests, cache_semantic (pgvector),
                              match_semantic_cache RPC

proxy/                        FastAPI service (see proxy/README.md)
```

## Data model (production schema)

- `profiles(id, email, full_name, avatar_url)` — 1:1 with `auth.users`
- `organizations(id, name, slug, created_by)` — multi-tenant workspace
- `organization_members(organization_id, user_id, role)` — `owner | admin | member`
- `api_keys(id, organization_id, name, key_prefix, key_hash, revoked_at, last_used_at)` — only sha256 hashes are stored
- `org_settings(organization_id, similarity_threshold, cache_ttl_seconds, semantic_cache_enabled, exact_cache_enabled)`
- `requests(id, organization_id, api_key_id, provider, model, cache_status, similarity, prompt_tokens, completion_tokens, total_tokens, cost_usd, cost_saved_usd, latency_ms, status_code, error, created_at)`
- `cache_semantic(id, organization_id, provider, model, prompt_hash, prompt, embedding vector(1536), response, hit_count, expires_at, …)`
- `public.match_semantic_cache(org, provider, model, embedding, threshold, limit)` — RPC used by the proxy

RLS: users see only rows for organizations they belong to. Admins/owners
manage keys and settings. The proxy uses a service-role connection.

## Proxy API contract (production-ready)

`POST /v1/chat/completions` — OpenAI-compatible.
`POST /v1/messages` — Anthropic-compatible (normalized to the shared cache pipeline).
`GET  /health` — liveness.

Auth: `Authorization: Bearer cc_live_...`

Flow: exact cache (Redis) → semantic cache (pgvector) → provider call →
populate caches → log to `requests`.

## Development

Dashboard (this project):
- Runs on Lovable Cloud with managed Postgres + Auth + edge runtime.
- Google sign-in is enabled by default.

Proxy: see [`proxy/README.md`](./proxy/README.md).

## Roadmap

Reserved seams already in place:

- Stripe usage-based billing (per-request rows in `requests`, org_id partitioning)
- Additional providers (add a `LLMProvider` class + router match)
- Streaming responses (needs SSE passthrough with chunk hashing)
- Provider failover + intelligent routing (router.resolve returns a chain)
- Audit logs & SSO (add a role check + expand `org_role` enum)

MIT.
