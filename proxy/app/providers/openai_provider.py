from __future__ import annotations
from typing import Any

from openai import AsyncOpenAI

from ..config import get_settings
from ..pricing import estimate_cost
from ..schemas import NormalizedResponse


class OpenAIProvider:
    name = "openai"

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured on the proxy")
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def chat(self, model: str, payload: dict[str, Any]) -> NormalizedResponse:
        # Drop keys we handle ourselves and any Nones.
        body = {k: v for k, v in payload.items() if v is not None and k != "stream"}
        body["model"] = model
        resp = await self._client.chat.completions.create(**body)
        raw = resp.model_dump()
        usage = raw.get("usage") or {}
        prompt_tokens = int(usage.get("prompt_tokens", 0))
        completion_tokens = int(usage.get("completion_tokens", 0))
        return NormalizedResponse(
            provider=self.name,
            model=model,
            payload=raw,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            cost_usd=estimate_cost(model, prompt_tokens, completion_tokens),
        )

    async def embed(self, model: str, text: str) -> list[float]:
        r = await self._client.embeddings.create(model=model, input=text)
        return r.data[0].embedding
