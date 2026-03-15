"""
Script xây chỉ mục RAG: lấy nội dung từ earth history / khóa học, embed qua embedding service, lưu ra JSON.
Chạy từ thư mục services/ai: python scripts/build_rag_index.py
Cần embedding service chạy (port 5004).
"""
import json
import os
import sys
from pathlib import Path

import httpx

# Thêm dữ liệu mẫu (có thể thay bằng API hoặc file từ client)
SAMPLE_CHUNKS = [
    "Kỷ Cambrian bắt đầu khoảng 540 triệu năm trước, đánh dấu sự bùng nổ sự sống đa bào phức tạp.",
    "Trilobita là nhóm động vật chân khớp đã tuyệt chủng, phổ biến trong đại Cổ sinh.",
    "Great Oxidation Event xảy ra khoảng 2.4 tỷ năm trước, khi vi khuẩn quang hợp làm tăng oxy trong khí quyển.",
    "Khủng long xuất hiện ở kỷ Tam Điệp và thống trị đến cuối kỷ Phấn trắng.",
    "Hệ Mặt Trời hình thành cách đây khoảng 4.6 tỷ năm từ tinh vân mặt trời.",
]

EMBEDDING_URL = os.environ.get("EMBEDDING_URL", "http://localhost:5004")
OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "rag_index.json"


async def fetch_all():
    documents = []
    async with httpx.AsyncClient(timeout=30.0) as c:
        for i, text in enumerate(SAMPLE_CHUNKS):
            r = await c.post(
                f"{EMBEDDING_URL.rstrip('/')}/embed_one",
                json={"text": text},
            )
            if r.status_code != 200:
                print(f"Lỗi embed chunk {i}: {r.status_code}", file=sys.stderr)
                continue
            emb = r.json().get("embedding")
            if emb:
                documents.append({"text": text, "embedding": emb})
    return documents


def main():
    import asyncio
    documents = asyncio.run(fetch_all())

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(documents, f, ensure_ascii=False, indent=0)
    print(f"Đã ghi {len(documents)} đoạn vào {OUT_PATH}")


if __name__ == "__main__":
    main()
