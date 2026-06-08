"""Làm sạch text assistant trước khi trả client."""
import re

_ASSISTANT_LEAK_RE = re.compile(
    r"</\s*assistant\s*>|<\s*assistant\s*>|<\|[^|>]{1,40}\|>",
    re.IGNORECASE,
)


def _line_looks_like_markdown_table(line: str) -> bool:
    if "|" not in line:
        return False
    pipe_count = line.count("|")
    return "---" in line or ":---" in line or "---:" in line or pipe_count >= 4


def _peel_title_before_markdown_table(line: str) -> str:
    if line.lstrip().startswith("|") or not _line_looks_like_markdown_table(line):
        return line
    first_pipe = line.find("|")
    if first_pipe <= 0:
        return line
    title = line[:first_pipe].strip()
    table_part = line[first_pipe:].strip()
    if not title or not table_part:
        return line
    return f"{title}\n\n{table_part}"


def _unfold_collapsed_markdown_tables(text: str) -> str:
    """GFM tables need one row per line; LLM sometimes collapses rows onto one line."""
    if "|" not in text:
        return text
    out_lines: list[str] = []
    for line in text.split("\n"):
        if "|" not in line:
            out_lines.append(line)
            continue
        if not _line_looks_like_markdown_table(line):
            out_lines.append(line)
            continue
        row = _peel_title_before_markdown_table(line)
        if "\n\n" in row:
            out_lines.extend(row.split("\n"))
            continue
        row = re.sub(r"\|{2,}", "|\n|", row)
        row = re.sub(r"\|\s+\|", "|\n|", row)
        out_lines.extend(row.split("\n"))
    return "\n".join(out_lines)


def sanitize_assistant_content(text: str | None) -> str:
    if not text:
        return ""
    s = _ASSISTANT_LEAK_RE.sub("", str(text))
    s = _unfold_collapsed_markdown_tables(s.strip())
    return s.strip()
