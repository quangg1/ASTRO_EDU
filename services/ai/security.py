"""
LLM Security – kiểm tra nội dung trước khi đưa tới model.
Đồng bộ với client/src/lib/llmSecurity.ts (từ chối thống nhất tiếng Việt).
"""
import unicodedata

REFUSAL_MESSAGE_VI = (
    "Xin lỗi, tôi không thể hỗ trợ câu hỏi này. "
    "Bạn có thể hỏi về lịch sử Trái Đất, hóa thạch, thiên văn hoặc nội dung khóa học."
)

BLOCKED_TERMS = [
    "ma túy", "ma tuý", "làm ma túy", "cách làm ma túy", "chế ma túy", "sản xuất ma túy",
    "drugs", "make drugs", "how to make drugs", "manufacture drugs",
    "meth", "cocaine", "heroin", "cannabis",
    "sản xuất heroin", "chế cocaine", "cách nấu", "nấu ma túy",
    "chế tạo bom", "làm bom", "how to make a bomb", "make explosives",
    "chế vũ khí", "súng tự chế",
    "cách hack tài khoản", "hack mật khẩu", "đột nhập hệ thống",
    "rửa tiền", "money laundering", "lừa đảo", "scam", "mua bán người", "trafficking",
]


def _normalize(text: str) -> str:
    if not text:
        return ""
    s = unicodedata.normalize("NFD", text.lower().strip())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def is_request_blocked(messages: list[dict]) -> bool:
    """Kiểm tra tin user mới nhất. Nếu vi phạm → True."""
    if not messages:
        return False
    last_user = next((m for m in reversed(messages) if m.get("role") == "user"), None)
    if not last_user:
        return False
    content = last_user.get("content")
    if isinstance(content, str):
        text = content
    elif isinstance(content, list):
        # Multimodal: [{ "type": "text", "text": "..." }, { "type": "image_url", ... }]
        text = " ".join(
            c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"
        )
    else:
        return False
    normalized = _normalize(text)
    for term in BLOCKED_TERMS:
        if _normalize(term) in normalized:
            return True
    return False
