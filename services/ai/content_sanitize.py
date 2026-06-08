"""Làm sạch text assistant trước khi trả client."""
import re

_ASSISTANT_LEAK_RE = re.compile(
    r"</\s*assistant\s*>|<\s*assistant\s*>|<\|[^|>]{1,40}\|>",
    re.IGNORECASE,
)


def _unfold_collapsed_markdown_tables(text: str) -> str:
    """GFM tables need one row per line; LLM sometimes collapses rows onto one line."""
    if "|" not in text:
        return text
    out_lines: list[str] = []
    for line in text.split("\n"):
        if "|" not in line:
            out_lines.append(line)
            continue
        pipe_count = line.count("|")
        looks_like_table = (
            "---" in line or ":---" in line or "---:" in line or pipe_count >= 4
        )
        if not looks_like_table:
            out_lines.append(line)
            continue
        out_lines.append(re.sub(r"\|\s+\|", "|\n|", line))
    return "\n".join(out_lines)


def sanitize_assistant_content(text: str | None) -> str:
    if not text:
        return ""
    s = _ASSISTANT_LEAK_RE.sub("", str(text))
    s = _unfold_collapsed_markdown_tables(s.strip())
    return s.strip()
