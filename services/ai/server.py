"""
AI Service – Python: RAG, security, hội thoại đa phương thức (text + hình ảnh).
Chạy: uvicorn server:app --host 0.0.0.0 --port 5005
"""
import asyncio
import os
from pathlib import Path
from typing import Annotated, Any

import httpx
import knowledge_pipeline as kp
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from agent_tools import (
    USE_AGENT_TOOLS,
    extract_tool_calls_from_response,
    tools_for_context,
    validate_and_normalize_tool_calls,
)
from rag import reload_index, retrieve
from security import REFUSAL_MESSAGE_VI, is_request_blocked

LM_STUDIO_URL = os.environ.get("LM_STUDIO_URL", "http://localhost:1234")
LM_MODEL = os.environ.get("LM_STUDIO_MODEL", "local")
USE_RAG = os.environ.get("USE_RAG", "1") == "1"

SYSTEM_GENERAL = """Bạn là AI Tutor của Galaxies Edu – nền tảng học thiên văn và lịch sử Trái Đất.
Trả lời câu hỏi về lịch sử Trái Đất (4.6 tỷ năm), hóa thạch, địa chất, sinh học tiến hóa, thiên văn (Hệ Mặt Trời, Milky Way), và khóa học.
Quy tắc: Trả lời bằng tiếng Việt khi người dùng viết tiếng Việt. Ngắn gọn, dễ hiểu.
Từ chối: Nếu câu hỏi không liên quan học tập hoặc vi phạm, chỉ trả lời: "{}" Không thêm tiếng Anh.""".format(
    REFUSAL_MESSAGE_VI
)


def build_course_system(course: dict) -> str:
    lessons = course.get("lessons") or []
    lines = [
        f'- {l.get("slug")}: "{l.get("title")}" ({l.get("type")})'
        for l in lessons
    ]
    lesson_list = "\n".join(lines)
    current = course.get("currentLessonSlug") or ""
    core = f"""Bạn là AI AGENT trong khóa học "{course.get('courseTitle', '')}" của Galaxies Edu.

DANH SÁCH BÀI:
{lesson_list}
Bài đang xem: {current}

Trả lời bằng tiếng Việt.
Từ chối: Nếu câu hỏi vi phạm, chỉ trả lời: "{REFUSAL_MESSAGE_VI}" """
    if USE_AGENT_TOOLS:
        return (
            core
            + "\n\nBạn có tool: open_lesson(lesson_slug), go_to_explore(stage_time_ma). "
            "Khi người dùng muốn mở bài hoặc xem Khám phá, ưu tiên gọi đúng tool; slug phải có trong danh sách. "
            "Có thể giải thích ngắn trong tin nhắn. "
            "Nếu môi trường không hỗ trợ tool, thêm một dòng cuối: [ACTION:open_lesson:slug] hoặc [ACTION:go_to_explore:số_Ma]."
        )
    return (
        core
        + "\n\nBạn có thể mở bài học hoặc chuyển Khám phá. Dùng: [ACTION:open_lesson:slug] hoặc [ACTION:go_to_explore:time]. "
        "Khi gợi ý, thêm đúng 1 dòng cuối: [ACTION:open_lesson:slug] hoặc [ACTION:go_to_explore:số_Ma]."
    )


def build_general_system() -> str:
    if USE_AGENT_TOOLS:
        return (
            SYSTEM_GENERAL
            + "\n\nBạn có tool: go_to_explore(stage_time_ma), open_courses, open_dashboard, open_my_courses — "
            "chỉ gọi khi người dùng rõ ràng muốn mở trang tương ứng; nếu chỉ hỏi kiến thức thì không cần tool."
        )
    return SYSTEM_GENERAL


def augment_system_with_agent_state(system: str, state: "AgentStateBody | None") -> str:
    if not state:
        return system
    parts: list[str] = []
    if state.pathname:
        parts.append(f"Đường dẫn hiện tại: {state.pathname}")
    if state.search:
        parts.append(f"Query URL: {state.search}")
    if state.route_label:
        parts.append(f"Màn hình: {state.route_label}")
    if not parts:
        return system
    return system.rstrip() + "\n\n[Hành vi / vị trí trên web]\n" + "\n".join(parts) + "\n"


class ChatMessage(BaseModel):
    role: str
    content: str | list[dict[str, Any]] = Field(default="")


class AgentStateBody(BaseModel):
    """Ngữ cảnh UI do client gửi — giúp agent hiểu hành vi / trang đang xem."""

    pathname: str | None = None
    search: str | None = None
    route_label: str | None = None


class ChatRequestBody(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)
    context: str = "general"
    course: dict | None = None
    image_base64: str | None = None
    image_media_type: str = "image/jpeg"
    agent_state: AgentStateBody | None = None


class KnowledgeAppendBody(BaseModel):
    text: str = Field(..., min_length=8, max_length=32000)
    source: str | None = Field(None, max_length=240)


app = FastAPI(title="Galaxies AI", version="1.0.0")
_knowledge_lock = asyncio.Lock()


def require_knowledge_admin(
    authorization: str | None = Header(None),
    x_knowledge_token: str | None = Header(None, alias="X-Knowledge-Token"),
) -> None:
    """Khi set KNOWLEDGE_ADMIN_TOKEN, mọi thao tác ghi index bắt buộc kèm Bearer hoặc X-Knowledge-Token."""
    expected = os.environ.get("KNOWLEDGE_ADMIN_TOKEN", "").strip()
    if not expected:
        return
    got: str | None = None
    if authorization and authorization.lower().startswith("bearer "):
        got = authorization[7:].strip()
    if x_knowledge_token:
        got = x_knowledge_token.strip()
    if not got or got != expected:
        raise HTTPException(status_code=403, detail="Thiếu hoặc sai KNOWLEDGE_ADMIN_TOKEN")


def _last_user_text(messages: list[dict]) -> str:
    for m in reversed(messages):
        if m.get("role") == "user":
            c = m.get("content")
            if isinstance(c, str):
                return c
            if isinstance(c, list):
                return " ".join(
                    x.get("text", "") for x in c if isinstance(x, dict) and x.get("type") == "text"
                )
            return ""
    return ""


def _build_messages_for_llm(
    messages: list[dict],
    system_with_rag: str,
    image_base64: str | None,
    image_media_type: str,
) -> list[dict]:
    out = [{"role": "system", "content": system_with_rag}]
    for m in messages:
        if m.get("role") == "system":
            continue
        role = "user" if m.get("role") == "user" else "assistant"
        content = m.get("content", "")
        is_last_user = role == "user" and m is messages[-1]
        if is_last_user and image_base64:
            part = content if isinstance(content, str) else ""
            url = f"data:{image_media_type};base64,{image_base64}"
            content = [
                {"type": "text", "text": part or "Giải thích hình ảnh này."},
                {"type": "image_url", "image_url": {"url": url}},
            ]
        out.append({"role": role, "content": content})
    return out


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai", "rag": USE_RAG}


@app.get("/knowledge/status")
def knowledge_status():
    """Số chunk trong index + số file .md trong corpus (read-only)."""
    index_path = Path(kp.RAG_INDEX_PATH)
    docs = kp.load_existing_documents(index_path)
    corpus = Path(kp.KNOWLEDGE_CORPUS_DIR)
    md_count = len(list(corpus.glob("*.md"))) if corpus.is_dir() else 0
    return {
        "index_path": str(index_path.resolve()),
        "corpus_dir": str(corpus.resolve()),
        "chunk_count": len(docs),
        "corpus_md_files": md_count,
        "include_seed": kp.RAG_INCLUDE_SEED,
        "admin_token_configured": bool(os.environ.get("KNOWLEDGE_ADMIN_TOKEN", "").strip()),
    }


@app.post("/knowledge/reload")
def knowledge_reload(_: Annotated[None, Depends(require_knowledge_admin)]):
    """Đọc lại rag_index.json vào RAM (sau khi copy file hoặc append từ ngoài)."""
    reload_index()
    return {"ok": True}


@app.post("/knowledge/rebuild")
async def knowledge_rebuild(_: Annotated[None, Depends(require_knowledge_admin)]):
    """
    Đọc toàn bộ knowledge/corpus/*.md (+ seed nếu bật), embed lại, ghi đè index.
    Cần embedding service (EMBEDDING_URL).
    """
    async with _knowledge_lock:
        summary = await kp.rebuild_knowledge_index()
        reload_index()
    return {"ok": True, **summary}


@app.post("/knowledge/append")
async def knowledge_append(
    body: KnowledgeAppendBody,
    _: Annotated[None, Depends(require_knowledge_admin)],
):
    """Thêm một đoạn văn vào index (feed nhanh, không cần tạo file .md)."""
    src = body.source or "api/append"
    async with _knowledge_lock:
        result = await kp.append_chunk(body.text, src)
        if not result.get("ok"):
            raise HTTPException(status_code=502, detail=result.get("error", "append failed"))
        reload_index()
    return {"ok": True, "total_chunks": result.get("total_chunks")}


@app.post("/chat")
async def chat(body: ChatRequestBody):
    messages = [m.model_dump() for m in body.messages]
    if is_request_blocked(messages):
        return {"message": {"role": "assistant", "content": REFUSAL_MESSAGE_VI}}

    if body.context == "course" and body.course:
        base_system = build_course_system(body.course)
    else:
        base_system = build_general_system()

    system_content = augment_system_with_agent_state(base_system, body.agent_state)

    if USE_RAG:
        query = _last_user_text(messages)
        if query:
            chunks = await retrieve(query)
            if chunks:
                rag_block = (
                    "Tài liệu tham khảo (ưu tiên khi liên quan; có thể là cập nhật mới hơn kiến thức cut-off của model):\n"
                    + "\n---\n".join(chunks[:4])
                )
                system_content = system_content.rstrip() + "\n\n" + rag_block + "\n"

    api_messages = _build_messages_for_llm(
        messages,
        system_content,
        body.image_base64,
        body.image_media_type,
    )

    use_tools = USE_AGENT_TOOLS and not body.image_base64
    tools = tools_for_context(body.context) if use_tools else None
    temp = 0.7 if body.context == "general" else 0.6
    url = f"{LM_STUDIO_URL.rstrip('/')}/v1/chat/completions"

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            payload: dict[str, Any] = {
                "model": LM_MODEL,
                "messages": api_messages,
                "stream": False,
                "max_tokens": 1024,
                "temperature": temp,
            }
            if tools:
                payload["tools"] = tools
                payload["tool_choice"] = "auto"
            r = await client.post(url, json=payload)
            if r.status_code >= 400 and tools:
                payload.pop("tools", None)
                payload.pop("tool_choice", None)
                r = await client.post(url, json=payload)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Không kết nối được LM Studio: {e}")

    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=r.text or "LM Studio lỗi")

    data = r.json()
    msg = (data.get("choices") or [{}])[0].get("message") or {}
    raw_content = msg.get("content")
    if raw_content is None:
        content = ""
    elif isinstance(raw_content, str):
        content = raw_content.strip()
    else:
        content = str(raw_content).strip()

    raw_tc = extract_tool_calls_from_response(data)
    validated = (
        validate_and_normalize_tool_calls(body.context, body.course, raw_tc) if raw_tc else []
    )

    if not content and validated:
        content = "Mình đã chọn thao tác phù hợp — bạn có thể bấm nút bên dưới."
    elif not content and not validated:
        content = REFUSAL_MESSAGE_VI

    out: dict[str, Any] = {"message": {"role": "assistant", "content": content}}
    if validated:
        out["tool_calls"] = validated
    return out


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5005)
