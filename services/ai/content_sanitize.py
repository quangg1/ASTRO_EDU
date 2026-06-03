"""Làm sạch text assistant trước khi trả client."""
import re

_ASSISTANT_LEAK_RE = re.compile(
    r"</\s*assistant\s*>|<\s*assistant\s*>|<\|[^|>]{1,40}\|>",
    re.IGNORECASE,
)


def sanitize_assistant_content(text: str | None) -> str:
    if not text:
        return ""
    s = _ASSISTANT_LEAK_RE.sub("", str(text))
    return s.strip()
