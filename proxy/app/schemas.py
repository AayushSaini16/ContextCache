from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant", "tool"]
    content: str | list[dict[str, Any]] | None = None


class ChatCompletionRequest(BaseModel):
    model: str
    messages: list[ChatMessage]
    temperature: float | None = None
    top_p: float | None = None
    max_tokens: int | None = None
    stream: bool = False
    n: int | None = 1
    stop: str | list[str] | None = None
    presence_penalty: float | None = None
    frequency_penalty: float | None = None
    user: str | None = None

    model_config = {"extra": "allow"}


class Usage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class NormalizedResponse(BaseModel):
    """Provider-agnostic response, close to OpenAI's chat.completion shape."""
    provider: str
    model: str
    payload: dict[str, Any]      # the raw provider response, ready to return
    prompt_tokens: int = 0
    completion_tokens: int = 0
    cost_usd: float = Field(default=0.0)


class CacheStatus:
    EXACT = "exact_hit"
    SEMANTIC = "semantic_hit"
    MISS = "miss"
