from __future__ import annotations
import hashlib
from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import HTTPException, Request, status
from .db import get_pool


@dataclass
class ApiCaller:
    api_key_id: str
    organization_id: str


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


async def authenticate(request: Request) -> ApiCaller:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    token = auth[7:].strip()
    if not token.startswith("cc_"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid API key")
    digest = _sha256(token)
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, organization_id, revoked_at
            FROM public.api_keys
            WHERE key_hash = $1
            """,
            digest,
        )
    if row is None or row["revoked_at"] is not None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or revoked API key")

    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE public.api_keys SET last_used_at = $1 WHERE id = $2",
                datetime.now(timezone.utc),
                row["id"],
            )
    except Exception:  # noqa: BLE001
        pass
    return ApiCaller(api_key_id=str(row["id"]), organization_id=str(row["organization_id"]))
