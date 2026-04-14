"""
Corpus Markdown → chunk → embed → rag_index.json.
Dùng cho feed kiến thức liên tục: thêm file .md trong knowledge/corpus/ rồi rebuild hoặc gọi API append.
"""
from __future__ import annotations

import asyncio
import json
import os
import tempfile
from pathlib import Path

import httpx

EMBEDDING_URL = os.environ.get("EMBEDDING_URL", "http://localhost:5004")
RAG_INDEX_PATH = os.environ.get("RAG_INDEX_PATH", str(Path(__file__).parent / "data" / "rag_index.json"))
KNOWLEDGE_CORPUS_DIR = os.environ.get(
    "KNOWLEDGE_CORPUS_DIR",
    str(Path(__file__).parent / "knowledge" / "corpus"),
)
RAG_CHUNK_MAX_CHARS = int(os.environ.get("RAG_CHUNK_MAX_CHARS", "720"))
EMBED_CONCURRENCY = int(os.environ.get("EMBED_CONCURRENCY", "4"))

# Đoạn nền nhỏ khi corpus trống hoặc kèm theo (tắt: RAG_INCLUDE_SEED=0)
RAG_INCLUDE_SEED = os.environ.get("RAG_INCLUDE_SEED", "1") == "1"
DEFAULT_SEED_CHUNKS = [
    "Kỷ Cambrian bắt đầu khoảng 540 triệu năm trước, đánh dấu sự bùng nổ sự sống đa bào phức tạp.",
    "Trilobita là nhóm động vật chân khớp đã tuyệt chủng, phổ biến trong đại Cổ sinh.",
    "Great Oxidation Event xảy ra khoảng 2.4 tỷ năm trước, khi vi khuẩn quang hợp làm tăng oxy trong khí quyển.",
    "Khủng long xuất hiện ở kỷ Tam Điệp và thống trị đến cuối kỷ Phấn trắng.",
    "Hệ Mặt Trời hình thành cách đây khoảng 4.6 tỷ năm từ tinh vân mặt trời.",
]


def chunk_markdown_content(content: str, max_chars: int = RAG_CHUNK_MAX_CHARS) -> list[str]:
    """Chia nội dung Markdown thành các đoạn vừa embedding."""
    parts = [p.strip() for p in content.split("\n\n") if p.strip()]
    chunks: list[str] = []
    buf = ""
    for p in parts:
        if len(buf) + len(p) + 2 <= max_chars:
            buf = buf + "\n\n" + p if buf else p
        else:
            if buf:
                chunks.append(buf)
            if len(p) <= max_chars:
                buf = p
            else:
                for i in range(0, len(p), max_chars):
                    chunks.append(p[i : i + max_chars])
                buf = ""
    if buf:
        chunks.append(buf)
    return chunks


def load_markdown_corpus(corpus_dir: str | Path) -> list[tuple[str, str]]:
    """
    Đọc mọi file .md trong corpus_dir (không đệ quy).
    Trả về [(relative_path, full_text), ...]
    """
    root = Path(corpus_dir)
    if not root.is_dir():
        return []
    out: list[tuple[str, str]] = []
    for path in sorted(root.glob("*.md")):
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        rel = path.name
        out.append((rel, text))
    return out


def collect_chunks_from_corpus(corpus_dir: str | Path) -> list[tuple[str, str]]:
    """(source_id, chunk_text) từ toàn bộ .md trong corpus."""
    items: list[tuple[str, str]] = []
    for source, md in load_markdown_corpus(corpus_dir):
        for ch in chunk_markdown_content(md):
            if ch.strip():
                items.append((f"corpus/{source}", ch.strip()))
    return items


async def embed_one(client: httpx.AsyncClient, text: str) -> list[float] | None:
    r = await client.post(
        f"{EMBEDDING_URL.rstrip('/')}/embed_one",
        json={"text": text[:8000]},
    )
    if r.status_code != 200:
        return None
    return r.json().get("embedding")


async def embed_texts_parallel(texts: list[str]) -> list[list[float] | None]:
    if not texts:
        return []
    sem = asyncio.Semaphore(EMBED_CONCURRENCY)
    results: list[list[float] | None] = [None] * len(texts)

    async def run_one(i: int, t: str) -> None:
        async with sem:
            async with httpx.AsyncClient(timeout=60.0) as c:
                results[i] = await embed_one(c, t)

    await asyncio.gather(*(run_one(i, t) for i, t in enumerate(texts)))
    return results


def atomic_write_json(path: Path, payload: dict | list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(suffix=".json", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=0)
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def load_existing_documents(index_path: Path) -> list[dict]:
    if not index_path.exists():
        return []
    try:
        with open(index_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return []
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)]
    if isinstance(data, dict):
        docs = data.get("documents")
        if isinstance(docs, list):
            return [x for x in docs if isinstance(x, dict)]
    return []


async def rebuild_knowledge_index() -> dict:
    """
    Đọc corpus + seed (tuỳ cấu hình), embed, ghi rag_index.json dạng { documents: [...] }.
    Trả về { chunks, skipped, corpus_files }.
    """
    path = Path(RAG_INDEX_PATH)
    corpus_path = Path(KNOWLEDGE_CORPUS_DIR)

    pairs: list[tuple[str, str]] = []
    if RAG_INCLUDE_SEED:
        for t in DEFAULT_SEED_CHUNKS:
            pairs.append(("seed/builtin", t))
    pairs.extend(collect_chunks_from_corpus(corpus_path))

    if not pairs:
        atomic_write_json(path, {"version": 1, "documents": []})
        return {"chunks": 0, "skipped": 0, "corpus_files": 0}

    sources, texts = zip(*pairs)
    embeddings = await embed_texts_parallel(list(texts))

    documents: list[dict] = []
    skipped = 0
    for src, text, emb in zip(sources, texts, embeddings):
        if not emb:
            skipped += 1
            continue
        documents.append({"text": text, "embedding": emb, "source": src})

    atomic_write_json(path, {"version": 1, "documents": documents})
    return {
        "chunks": len(documents),
        "skipped": skipped,
        "corpus_files": len(load_markdown_corpus(corpus_path)),
    }


async def append_chunk(text: str, source: str) -> dict:
    """Embed một đoạn, nối vào index hiện có, ghi lại file."""
    path = Path(RAG_INDEX_PATH)
    text = text.strip()
    if len(text) < 8:
        return {"ok": False, "error": "text too short"}

    async with httpx.AsyncClient(timeout=60.0) as c:
        emb = await embed_one(c, text)
    if not emb:
        return {"ok": False, "error": "embedding failed"}

    docs = load_existing_documents(path)
    docs.append({"text": text, "embedding": emb, "source": source})
    atomic_write_json(path, {"version": 1, "documents": docs})
    return {"ok": True, "total_chunks": len(docs)}
