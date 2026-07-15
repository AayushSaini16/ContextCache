# ContextCache Proxy

FastAPI service that sits between your app and OpenAI / Anthropic. Handles:

- API-key authentication against the shared ContextCache Postgres
- Exact caching via Redis
- Semantic caching via pgvector (`match_semantic_cache` RPC)
- ProviderRouter → LLMProvider adapters (OpenAI, Anthropic)
- Structured request logging back to the shared Postgres

The dashboard app (built in Lovable) reads from the same Postgres. This service
is the write path.

## Quick start

```bash
cp .env.example .env
# fill in DATABASE_URL, REDIS_URL, OPENAI_API_KEY, ANTHROPIC_API_KEY

docker compose up --build
```

Point your OpenAI SDK at it:

```python
from openai import OpenAI
client = OpenAI(
    api_key="cc_live_...",                # from the dashboard
    base_url="http://localhost:8000/v1",
)
resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
)
```

## Endpoints

| Method | Path                    | Description                                 |
| ------ | ----------------------- | ------------------------------------------- |
| POST   | `/v1/chat/completions`  | OpenAI-compatible chat endpoint, cached     |
| POST   | `/v1/messages`          | Anthropic-compatible endpoint, cached       |
| GET    | `/health`               | Liveness probe                              |

## Environment variables

See `.env.example`.

- `DATABASE_URL` — the same Postgres the dashboard uses
- `REDIS_URL` — e.g. `redis://redis:6379/0`
- `OPENAI_API_KEY` — server-side; customer `cc_live_*` keys never leak to providers
- `ANTHROPIC_API_KEY`
- `EMBEDDING_MODEL` — default `text-embedding-3-small` (1536-dim, matches DB schema)

## Architecture

```
client  →  FastAPI  →  auth (hash cc_live_* → api_keys row)
                   →  Cache engine
                        ├─ Redis exact key    (SHA256 of payload)
                        └─ pgvector semantic  (embed prompt, cosine search)
                   →  ProviderRouter → LLMProvider (openai | anthropic)
                   →  log to requests table
                   →  populate caches on miss
```

## Tests

```bash
pip install -e ".[dev]"
pytest
```

## Deployment

Any container platform (Fly.io, Railway, Render, ECS, GKE). The container is
stateless — state lives in Postgres + Redis. Run behind an HTTPS reverse proxy.
