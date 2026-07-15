from __future__ import annotations
from typing import Any

from .config import get_settings
from .providers import AnthropicProvider, LLMProvider, OpenAIProvider


class ProviderRouter:
    """Route a request to the correct LLMProvider based on model name.

    - openai models: any model starting with 'gpt-', 'o1', 'o3', 'chatgpt-'
    - anthropic models: any model starting with 'claude-'
    - Extend by adding a matcher below.
    """

    def __init__(self) -> None:
        self._openai: LLMProvider | None = None
        self._anthropic: LLMProvider | None = None
        # For embeddings we always use OpenAI's text-embedding-* models today.
        self._embedder: LLMProvider | None = None

    def _get_openai(self) -> LLMProvider:
        if self._openai is None:
            self._openai = OpenAIProvider()
        return self._openai

    def _get_anthropic(self) -> LLMProvider:
        if self._anthropic is None:
            self._anthropic = AnthropicProvider()
        return self._anthropic

    def resolve(self, model: str) -> LLMProvider:
        m = model.lower()
        if m.startswith(("gpt-", "o1", "o3", "chatgpt-", "openai/")):
            return self._get_openai()
        if m.startswith(("claude-", "anthropic/")):
            return self._get_anthropic()
        raise ValueError(f"No provider configured for model '{model}'")

    async def chat(self, model: str, payload: dict[str, Any]):
        return await self.resolve(model).chat(model, payload)

    async def embed(self, text: str) -> list[float]:
        # Embeddings always go through OpenAI in this build.
        settings = get_settings()
        return await self._get_openai().embed(settings.embedding_model, text)


router = ProviderRouter()
