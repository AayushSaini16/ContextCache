from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..auth import ApiCaller, authenticate
from ..cache import cache, normalized_prompt
from ..db import get_pool
from ..router import router as provider_router
from ..schemas import CacheStatus, ChatCompletionRequest

api = APIRouter()


async def _log_request(
    caller: ApiCaller,
    provider: str,
    model: str,
    status_val: str,
    similarity: float | None,
    prompt_tokens: int,
    completion_tokens: int,
    cost_usd: float,
    cost_saved_usd: float,
    latency_ms: int,
    status_code: int = 200,
    error: str | None = None,
) -> None:
    pool = await get_pool()
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO public.requests
                    (organization_id, api_key_id, provider, model, cache_status,
                     similarity, prompt_tokens, completion_tokens, total_tokens,
                     cost_usd, cost_saved_usd, latency_ms, status_code, error)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                """,
                caller.organization_id,
                caller.api_key_id,
                provider,
                model,
                status_val,
                similarity,
                prompt_tokens,
                completion_tokens,
                prompt_tokens + completion_tokens,
                cost_usd,
                cost_saved_usd,
                latency_ms,
                status_code,
                error,
            )
    except Exception:  # noqa: BLE001
        # Logging must never break the request path.
        pass


@api.post("/v1/chat/completions")
async def chat_completions(
    body: ChatCompletionRequest,
    request: Request,
    caller: ApiCaller = Depends(authenticate),
):
    if body.stream:
        # Streaming bypasses caching. Left as a future enhancement — we don't lie about it.
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Streaming is not supported yet — set stream=false. See the roadmap.",
        )

    start = time.perf_counter()
    provider = provider_router.resolve(body.model)
    settings = await cache.get_org_settings(caller.organization_id)
    payload: dict[str, Any] = body.model_dump(exclude_none=True)

    # 1) Exact cache
    if settings["exact_cache_enabled"]:
        hit = await cache.get_exact(
            caller.organization_id, provider.name, body.model, payload
        )
        if hit is not None:
            latency = int((time.perf_counter() - start) * 1000)
            await _log_request(
                caller,
                provider.name,
                body.model,
                CacheStatus.EXACT,
                None,
                hit.prompt_tokens,
                hit.completion_tokens,
                0.0,
                hit.cost_usd,
                latency,
            )
            return hit.payload

    # 2) Semantic cache
    prompt_text = normalized_prompt([m.model_dump() for m in body.messages])
    if settings["semantic_cache_enabled"] and prompt_text:
        try:
            embedding = await provider_router.embed(prompt_text)
            hit = await cache.get_semantic(
                caller.organization_id,
                provider.name,
                body.model,
                embedding,
                float(settings["similarity_threshold"]),
            )
            if hit is not None:
                latency = int((time.perf_counter() - start) * 1000)
                await _log_request(
                    caller,
                    provider.name,
                    body.model,
                    CacheStatus.SEMANTIC,
                    hit.similarity,
                    hit.prompt_tokens,
                    hit.completion_tokens,
                    0.0,
                    hit.cost_usd,
                    latency,
                )
                return hit.payload
        except Exception as exc:  # noqa: BLE001
            # Embedding failure should never fail the call — fall through to a live call.
            embedding = None
    else:
        embedding = None

    # 3) Miss — call provider
    try:
        result = await provider.chat(body.model, payload)
    except Exception as exc:  # noqa: BLE001
        latency = int((time.perf_counter() - start) * 1000)
        await _log_request(
            caller,
            provider.name,
            body.model,
            CacheStatus.MISS,
            None,
            0,
            0,
            0.0,
            0.0,
            latency,
            status_code=502,
            error=str(exc)[:500],
        )
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Upstream provider error") from exc

    latency = int((time.perf_counter() - start) * 1000)

    ttl = int(settings["cache_ttl_seconds"])
    if settings["exact_cache_enabled"]:
        await cache.put_exact(
            caller.organization_id,
            provider.name,
            body.model,
            payload,
            result.payload,
            result.prompt_tokens,
            result.completion_tokens,
            result.cost_usd,
            ttl,
        )
    if settings["semantic_cache_enabled"] and embedding is not None:
        try:
            await cache.put_semantic(
                caller.organization_id,
                provider.name,
                body.model,
                prompt_text,
                embedding,
                result.payload,
                result.prompt_tokens,
                result.completion_tokens,
                result.cost_usd,
                ttl,
            )
        except Exception:
            pass

    await _log_request(
        caller,
        provider.name,
        body.model,
        CacheStatus.MISS,
        None,
        result.prompt_tokens,
        result.completion_tokens,
        result.cost_usd,
        0.0,
        latency,
    )
    return result.payload


# Anthropic-compatible endpoint delegates to the same pipeline but rewrites the body
# to OpenAI-style so the cache/provider layer can reuse the same code path.
@api.post("/v1/messages")
async def anthropic_messages(
    request: Request,
    caller: ApiCaller = Depends(authenticate),
):
    body = await request.json()
    messages = body.get("messages") or []
    system = body.get("system")
    oa_messages = []
    if system:
        oa_messages.append({"role": "system", "content": system})
    for m in messages:
        oa_messages.append({"role": m.get("role"), "content": m.get("content")})
    normalized = ChatCompletionRequest.model_validate(
        {
            "model": body.get("model"),
            "messages": oa_messages,
            "max_tokens": body.get("max_tokens"),
            "temperature": body.get("temperature"),
        }
    )
    return await chat_completions(normalized, request, caller)
