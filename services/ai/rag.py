"""
RAG – lấy ngữ cảnh từ kho tài liệu (embedding + similarity search).
Gọi embedding service (Flag BGE-M3), tìm top-k đoạn liên quan.
"""
import os
import json
from pathlib import Path

import httpx
import numpy as np

EMBEDDING_URL = os.environ.get("EMBEDDING_URL", "http://localhost:5004")
RAG_TOP_K = int(os.environ.get("RAG_TOP_K", "4"))
RAG_INDEX_PATH = os.environ.get("RAG_INDEX_PATH", str(Path(__file__).parent / "data" / "rag_index.json"))

_index: list[dict] | None = None  # [{ "text": str, "embedding": list[float], "source"?: str }, ...]


def reload_index() -> None:
    """Xóa cache trong RAM để lần retrieve sau đọc lại file (sau rebuild/append)."""
    global _index
    _index = None


def _load_index() -> list[dict]:
    global _index
    if _index is not None:
        return _index
    path = Path(RAG_INDEX_PATH)
    if not path.exists():
        _index = []
        return _index
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        _index = data if isinstance(data, list) else data.get("documents", [])
    except Exception:
        _index = []
    return _index


async def embed_query(text: str) -> list[float] | None:
    """Embed một câu (query) qua embedding service."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                f"{EMBEDDING_URL.rstrip('/')}/embed_one",
                json={"text": text[:2000]},
            )
            if r.status_code != 200:
                return None
            data = r.json()
            return data.get("embedding")
    except Exception:
        return None


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a, dtype=float), np.array(b, dtype=float)
    n = np.linalg.norm(va) * np.linalg.norm(vb)
    return float(np.dot(va, vb) / n) if n > 0 else 0.0


async def retrieve(query: str, top_k: int = RAG_TOP_K) -> list[str]:
    """
    Embed query, tìm top_k đoạn giống nhất trong index, trả về list text.
    Nếu không có index hoặc embedding lỗi → trả về [].
    """
    docs = _load_index()
    if not docs:
        return []
    embedding = await embed_query(query)
    if not embedding:
        return []
    scored = []
    for d in docs:
        emb = d.get("embedding")
        if not emb:
            continue
        score = _cosine_similarity(embedding, emb)
        scored.append((score, d.get("text", "")))
    scored.sort(key=lambda x: -x[0])
    return [text for _, text in scored[:top_k] if text]
