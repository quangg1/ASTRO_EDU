"""
Kiểm tra nhanh knowledge/corpus trước khi merge / rebuild.
Chạy: python services/ai/scripts/validate_corpus.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

MAX_FILE_BYTES = 512 * 1024
_ROOT = Path(__file__).resolve().parent.parent
CORPUS = Path(os.environ.get("KNOWLEDGE_CORPUS_DIR", str(_ROOT / "knowledge" / "corpus")))


def main() -> int:
    if not CORPUS.is_dir():
        print(f"OK: chưa có thư mục corpus ({CORPUS}), bỏ qua.", file=sys.stderr)
        return 0

    md_files = sorted(CORPUS.glob("*.md"))
    if not md_files:
        print("OK: corpus trống (không có .md).")
        return 0

    errors: list[str] = []
    for p in md_files:
        try:
            raw = p.read_bytes()
        except OSError as e:
            errors.append(f"{p.name}: không đọc được ({e})")
            continue
        if len(raw) > MAX_FILE_BYTES:
            errors.append(f"{p.name}: quá lớn ({len(raw)} > {MAX_FILE_BYTES} bytes)")
            continue
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            errors.append(f"{p.name}: không phải UTF-8 hợp lệ")
            continue
        if not text.strip():
            errors.append(f"{p.name}: file rỗng")

    if errors:
        print("Lỗi corpus:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    print(f"OK: {len(md_files)} file .md trong {CORPUS}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
