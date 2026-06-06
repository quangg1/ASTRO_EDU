"""HTTP client helpers for the Flag BGE-M3 embedding service."""
from __future__ import annotations

import os

EMBEDDING_URL = os.environ.get("EMBEDDING_URL", "http://localhost:5004").rstrip("/")
EMBEDDING_API_KEY = os.environ.get("EMBEDDING_API_KEY", "").strip()
EMBED_TIMEOUT_SEC = float(os.environ.get("EMBED_TIMEOUT_SEC", "120"))


def embedding_request_headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if EMBEDDING_API_KEY:
        headers["Authorization"] = f"Bearer {EMBEDDING_API_KEY}"
        headers["X-Embedding-Token"] = EMBEDDING_API_KEY
    return headers
