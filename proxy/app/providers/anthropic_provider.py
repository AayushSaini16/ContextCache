from __future__ import annotations
from typing import Any

from anthropic import AsyncAnthropic

from ..config import get_settings
from ..pricing import estimate_cost
from ..schemas import NormalizedResponse


def _to_anthropic_messages(oa_messages: list[dict[str, Any]]) -> tuple[str | None, list[dict[str, Any]]]:
    """Split OpenAI-style messages into Anthropic (system, messages)."""
    system: str | None = None
    out: list[dict[str, Any]] = []
    for m in oa_messages:
        role = m.get("role")
        content = m.get("content", "")
        if role == "system":
            system = content if isinstance(content, str) else str(content)
            continue
        if role not in ("user", "assistant"):
            continue
        out.append({"role": role, "content": content})
    return system, out


class AnthropicProvider:
    name = "anthropic"

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not configured on the proxy")
        self._client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def chat(self, model: str, payload: dict[str, Any]) -> NormalizedResponse:
        messages = payload.get("messages", [])
        system, msgs = _to_anthropic_messages(messages)
        max_tokens = payload.get("max_tokens") or 1024
        temperature = payload.get("temperature")

        kwargs: dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": msgs,
        }
        if system:
            kwargs["system"] = system
        if temperature is not None:
            kwargs["temperature"] = temperature

        resp = await self._client.messages.create(**kwargs)
        raw = resp.model_dump()
        usage = raw.get("usage") or {}
        prompt_tokens = int(usage.get("input_tokens", 0))
        completion_tokens = int(usage.get("output_tokens", 0))
        return NormalizedResponse(
            provider=self.name,
            model=model,
            payload=raw,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            cost_usd=estimate_cost(model, prompt_tokens, completion_tokens),
        )

    async def embed(self, model: str, text: str) -> list[float]:
        raise NotImplementedError("Anthropic does not currently offer an embeddings API")
