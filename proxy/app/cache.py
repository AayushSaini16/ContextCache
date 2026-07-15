"""Exact + semantic cache engine.

Exact  → Redis, keyed by SHA256(provider|model|json(payload)).
Semantic → pgvector, using the match_semantic_cache RPC.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import orjson
from redis.asyncio import Redis

from .config import get_settings
from .db import get_pool


@dataclass
class CachedResponse:
    payload: dict[str, Any]
    prompt_tokens: int
    completion_tokens: int
    cost_usd: float
    similarity: float | None = None
    source: str = "exact"


_redis: Redis | None = None


def _get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(get_settings().redis_url, decode_responses=False)
    return _redis


def _exact_key(provider: str, model: str, payload: dict[str, Any]) -> str:
    body = json.dumps({"p": provider, "m": model, "b": payload}, sort_keys=True, default=str)
    return "cc:exact:" + hashlib.sha256(body.encode()).hexdigest()


def normalized_prompt(messages: list[dict[str, Any]]) -> str:
    """Flatten chat messages into a single text used for embedding + semantic match."""
    parts: list[str] = []
    for m in messages:
        role = m.get("role", "")
        content = m.get("content", "")
        if isinstance(content, list):
            content = " ".join(
                c.get("text", "") for c in content if isinstance(c, dict)
            )
        parts.append(f"{role}: {content}")
    return "\n".join(parts).strip()


class CacheEngine:
    async def get_org_settings(self, organization_id: str) -> dict[str, Any]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT similarity_threshold, cache_ttl_seconds,
                       semantic_cache_enabled, exact_cache_enabled
                FROM public.org_settings WHERE organization_id = $1
                """,
                organization_id,
            )
        if row is None:
            return {
                "similarity_threshold": 0.95,
                "cache_ttl_seconds": 3600,
                "semantic_cache_enabled": True,
                "exact_cache_enabled": True,
            }
        return dict(row)

    # ------------- Exact -------------
    async def get_exact(
        self, organization_id: str, provider: str, model: str, payload: dict[str, Any]
    ) -> CachedResponse | None:
        key = _exact_key(provider, model, payload) + ":" + organization_id
        raw = await _get_redis().get(key)
        if not raw:
            return None
        data = orjson.loads(raw)
        return CachedResponse(
            payload=data["payload"],
            prompt_tokens=data.get("prompt_tokens", 0),
            completion_tokens=data.get("completion_tokens", 0),
            cost_usd=data.get("cost_usd", 0.0),
            source="exact",
        )

    async def put_exact(
        self,
        organization_id: str,
        provider: str,
        model: str,
        payload: dict[str, Any],
        response: dict[str, Any],
        prompt_tokens: int,
        completion_tokens: int,
        cost_usd: float,
        ttl_seconds: int,
    ) -> None:
        key = _exact_key(provider, model, payload) + ":" + organization_id
        body = orjson.dumps(
            {
                "payload": response,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "cost_usd": cost_usd,
            }
        )
        if ttl_seconds > 0:
            await _get_redis().set(key, body, ex=ttl_seconds)
        else:
            await _get_redis().set(key, body)

    # ------------- Semantic -------------
    @staticmethod
    def _vec_literal(embedding: list[float]) -> str:
        # asyncpg cannot natively bind pgvector; send as a string literal.
        return "[" + ",".join(f"{x:.6f}" for x in embedding) + "]"

    async def get_semantic(
        self,
        organization_id: str,
        provider: str,
        model: str,
        embedding: list[float],
        threshold: float,
    ) -> CachedResponse | None:
        pool = await get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, response, prompt_tokens, completion_tokens, cost_usd, similarity
                FROM public.match_semantic_cache($1, $2, $3, $4::vector, $5, 1)
                """,
                organization_id,
                provider,
                model,
                self._vec_literal(embedding),
                threshold,
            )
        if row is None:
            return None
        # Bump hit_count
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE public.cache_semantic SET hit_count = hit_count + 1 WHERE id = $1",
                    row["id"],
                )
        except Exception:
            pass
        payload = row["response"]
        if isinstance(payload, (bytes, bytearray, str)):
            payload = json.loads(payload)
        return CachedResponse(
            payload=payload,
            prompt_tokens=row["prompt_tokens"] or 0,
            completion_tokens=row["completion_tokens"] or 0,
            cost_usd=float(row["cost_usd"] or 0),
            similarity=float(row["similarity"]),
            source="semantic",
        )

    async def put_semantic(
        self,
        organization_id: str,
        provider: str,
        model: str,
        prompt_text: str,
        embedding: list[float],
        response: dict[str, Any],
        prompt_tokens: int,
        completion_tokens: int,
        cost_usd: float,
        ttl_seconds: int,
    ) -> None:
        expires = None
        if ttl_seconds > 0:
            expires = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
        prompt_hash = hashlib.sha256(prompt_text.encode()).hexdigest()
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO public.cache_semantic
                    (organization_id, provider, model, prompt_hash, prompt,
                     embedding, response, prompt_tokens, completion_tokens,
                     cost_usd, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6::vector, $7::jsonb, $8, $9, $10, $11)
                """,
                organization_id,
                provider,
                model,
                prompt_hash,
                prompt_text,
                self._vec_literal(embedding),
                json.dumps(response),
                prompt_tokens,
                completion_tokens,
                cost_usd,
                expires,
            )


cache = CacheEngine()
