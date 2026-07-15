from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    redis_url: str = "redis://redis:6379/0"

    openai_api_key: str | None = None
    anthropic_api_key: str | None = None

    embedding_model: str = "text-embedding-3-small"
    embedding_dim: int = 1536

    log_level: str = "INFO"
    cors_origins: str = "*"


@lru_cache(1)
def get_settings() -> Settings:  # noqa: D401
    return Settings()  # type: ignore[call-arg]
