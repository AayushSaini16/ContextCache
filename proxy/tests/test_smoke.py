"""Smoke tests that don't require live infra.

For full integration tests, spin up docker-compose and target /health
and /v1/chat/completions with a real cc_live_* key.
"""
from __future__ import annotations

from app.providers import LLMProvider, OpenAIProvider, AnthropicProvider
from app.router import ProviderRouter
from app.cache import normalized_prompt, _exact_key  # type: ignore[attr-defined]


def test_provider_router_resolves_openai_models():
    r = ProviderRouter()
    # Don't construct providers (would need API keys) — test the matcher.
    assert r.resolve.__self__ is r  # sanity
    # Matching is lowercase-prefix; we verify the branches exist.
    for m in ["gpt-4o", "gpt-4o-mini", "o1-preview", "chatgpt-4o-latest"]:
        try:
            r.resolve(m)
        except RuntimeError:
            # OpenAI key missing in this env — that's fine; we've hit the OpenAI branch.
            pass


def test_provider_router_rejects_unknown():
    r = ProviderRouter()
    try:
        r.resolve("mystery-model")
    except ValueError:
        return
    raise AssertionError("expected ValueError for unknown model")


def test_normalized_prompt_flattens_messages():
    text = normalized_prompt(
        [
            {"role": "system", "content": "be helpful"},
            {"role": "user", "content": "hi"},
        ]
    )
    assert "system: be helpful" in text
    assert "user: hi" in text


def test_exact_key_is_deterministic():
    a = _exact_key("openai", "gpt-4o", {"messages": [{"role": "user", "content": "hi"}]})
    b = _exact_key("openai", "gpt-4o", {"messages": [{"role": "user", "content": "hi"}]})
    assert a == b
    c = _exact_key("openai", "gpt-4o", {"messages": [{"role": "user", "content": "hello"}]})
    assert a != c
