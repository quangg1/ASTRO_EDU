"""
RAG – lấy ngữ cảnh từ kho tài liệu (embedding + similarity search).
Gọi embedding service (Flag BGE-M3), tìm top-k đoạn liên quan.
"""
import os
import json
from pathlib import Path

import httpx
import numpy as np

from embedding_client import EMBED_TIMEOUT_SEC, EMBEDDING_URL, embedding_request_headers
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
        async with httpx.AsyncClient(timeout=EMBED_TIMEOUT_SEC) as client:
            r = await client.post(
                f"{EMBEDDING_URL}/embed_one",
                json={"text": text[:2000]},
                headers=embedding_request_headers(),
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


def _source_lesson_id(source: str | None) -> str | None:
    if not source:
        return None
    s = str(source).strip()
    if s.startswith("lp/"):
        return s[3:].split("/")[0] or None
    return None


def _source_community_post_id(source: str | None) -> str | None:
    if not source:
        return None
    s = str(source).strip()
    if s.startswith("community/"):
        return s[10:].split("/")[0] or None
    return None


def _source_matches_prefixes(source: str | None, prefixes: list[str] | None) -> bool:
    if not prefixes:
        return True
    if not source:
        return False
    s = str(source).strip()
    return any(s.startswith(p) for p in prefixes if p)


async def search_hits(
    query: str,
    top_k: int = RAG_TOP_K,
    lesson_id: str | None = None,
    source_prefixes: list[str] | None = None,
) -> list[dict]:
    """
    Embed query, similarity search — trả metadata đầy đủ cho agent tools.
    Mỗi phần tử: { "text", "source", "score" }.
    """
    docs = _load_index()
    if not docs:
        return []
    embedding = await embed_query(query)
    if not embedding:
        return []

    focus = str(lesson_id).strip() if lesson_id else ""
    prefixes = [p for p in (source_prefixes or []) if p]

    def score_doc(d: dict) -> tuple[float, str, str]:
        src = str(d.get("source") or "")
        if prefixes and not _source_matches_prefixes(src, prefixes):
            return (-1.0, "", src)
        emb = d.get("embedding")
        if not emb:
            return (-1.0, "", src)
        sim = _cosine_similarity(embedding, emb)
        if focus:
            src_lesson = _source_lesson_id(src)
            if src_lesson == focus:
                sim += 0.15
        text = d.get("text", "") or ""
        return (sim, text, src)

    scored: list[tuple[float, str, str]] = []
    for d in docs:
        s, t, src = score_doc(d)
        if s >= 0 and t:
            scored.append((s, t, src))
    scored.sort(key=lambda x: -x[0])

    if focus:
        focused = [(s, t, src) for s, t, src in scored if _source_lesson_id(src) == focus]
        if len(focused) >= top_k:
            scored = focused
        else:
            seen = {t for _, t, _ in focused}
            scored = focused + [(s, t, src) for s, t, src in scored if t not in seen]

    out: list[dict] = []
    for sim, text, src in scored[:top_k]:
        out.append({"text": text, "source": src, "score": round(sim, 5)})
    return out


async def retrieve(
    query: str,
    top_k: int = RAG_TOP_K,
    lesson_id: str | None = None,
) -> list[str]:
    """Embed query → top_k đoạn text (dùng cho prompt chat)."""
    hits = await search_hits(query, top_k=top_k, lesson_id=lesson_id)
    return [h["text"] for h in hits if h.get("text")]
