"""
Xây chỉ mục RAG từ knowledge/corpus/*.md (+ seed tùy RAG_INCLUDE_SEED).
Chạy từ thư mục services/ai: python scripts/build_rag_index.py
Cần embedding service (EMBEDDING_URL, mặc định port 5004).
"""
import asyncio
import sys
from pathlib import Path

# Cho phép chạy khi cwd không phải services/ai
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import knowledge_pipeline as kp  # noqa: E402


def main() -> None:
    async def run():
        summary = await kp.rebuild_knowledge_index()
        print(
            f"Đã ghi index: {summary['chunks']} chunk "
            f"(bỏ qua embed lỗi: {summary['skipped']}), "
            f"file .md trong corpus: {summary['corpus_files']}"
        )
        print(f"File: {kp.RAG_INDEX_PATH}")

    asyncio.run(run())


if __name__ == "__main__":
    main()
