from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any

from ..schemas import NormalizedResponse


class LLMProvider(ABC):
    """Abstract interface every provider adapter must implement."""

    name: str

    @abstractmethod
    async def chat(self, model: str, payload: dict[str, Any]) -> NormalizedResponse:
        """Call the provider's chat/completions endpoint and return a normalized response."""

    @abstractmethod
    async def embed(self, model: str, text: str) -> list[float]:
        """Return an embedding vector for the given text."""
