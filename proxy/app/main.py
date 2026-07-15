from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import close_pool, get_pool
from .routes.chat import api as chat_api

logging.basicConfig(level=get_settings().log_level)
log = logging.getLogger("contextcache")


@asynccontextmanager
async def lifespan(_: FastAPI):
    await get_pool()  # eagerly build the pool for faster first request
    log.info("proxy started")
    yield
    await close_pool()


app = FastAPI(
    title="ContextCache",
    version="0.1.0",
    description="The intelligent caching layer for LLM applications.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().cors_origins.split(",")],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_api)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
