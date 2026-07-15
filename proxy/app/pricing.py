"""Rough per-1k-token pricing snapshot; kept simple and maintainable."""
from __future__ import annotations

# USD per 1k tokens. Update as providers change prices.
PRICING: dict[str, tuple[float, float]] = {
    # OpenAI
    "gpt-4o":              (0.005,  0.015),
    "gpt-4o-mini":         (0.00015, 0.0006),
    "gpt-4-turbo":         (0.01,   0.03),
    "gpt-3.5-turbo":       (0.0005, 0.0015),
    # Anthropic
    "claude-3-5-sonnet-20241022": (0.003, 0.015),
    "claude-3-5-haiku-20241022":  (0.0008, 0.004),
    "claude-3-opus-20240229":     (0.015, 0.075),
}


def estimate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    key = model
    # normalize dated variants like "gpt-4o-2024-08-06" back to base
    if model not in PRICING:
        for base in PRICING:
            if model.startswith(base):
                key = base
                break
    if key not in PRICING:
        return 0.0
    p_in, p_out = PRICING[key]
    return (prompt_tokens / 1000) * p_in + (completion_tokens / 1000) * p_out
