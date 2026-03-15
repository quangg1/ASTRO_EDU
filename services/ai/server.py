"""
AI Service – Python: RAG, security, hội thoại đa phương thức (text + hình ảnh).
Chạy: uvicorn server:app --host 0.0.0.0 --port 5005
"""
import os
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from security import REFUSAL_MESSAGE_VI, is_request_blocked
from rag import retrieve

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
    return f"""Bạn là AI AGENT trong khóa học "{course.get('courseTitle', '')}" của Galaxies Edu.
Bạn có thể mở bài học hoặc chuyển Khám phá. Dùng hành động: [ACTION:open_lesson:slug] hoặc [ACTION:go_to_explore:time].

DANH SÁCH BÀI: 
{lesson_list}
Bài đang xem: {current}

Trả lời bằng tiếng Việt. Khi gợi ý bài hoặc Khám phá, thêm đúng 1 dòng cuối: [ACTION:open_lesson:slug] hoặc [ACTION:go_to_explore:số_Ma].
Từ chối: Nếu câu hỏi vi phạm, chỉ trả lời: "{REFUSAL_MESSAGE_VI}" """


class ChatMessage(BaseModel):
    role: str
    content: str | list[dict[str, Any]] = Field(default="")


class ChatRequestBody(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)
    context: str = "general"
    course: dict | None = None
    image_base64: str | None = None
    image_media_type: str = "image/jpeg"


app = FastAPI(title="Galaxies AI", version="1.0.0")


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


@app.post("/chat")
async def chat(body: ChatRequestBody):
    messages = [m.model_dump() for m in body.messages]
    if is_request_blocked(messages):
        return {"message": {"role": "assistant", "content": REFUSAL_MESSAGE_VI}}

    system_content = (
        build_course_system(body.course) if body.context == "course" and body.course else SYSTEM_GENERAL
    )

    if USE_RAG:
        query = _last_user_text(messages)
        if query:
            chunks = await retrieve(query)
            if chunks:
                rag_block = "Tài liệu tham khảo (chỉ dựa vào để trả lời):\n" + "\n---\n".join(chunks[:4])
                system_content = system_content.rstrip() + "\n\n" + rag_block + "\n"

    api_messages = _build_messages_for_llm(
        messages,
        system_content,
        body.image_base64,
        body.image_media_type,
    )

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                f"{LM_STUDIO_URL.rstrip('/')}/v1/chat/completions",
                json={
                    "model": LM_MODEL,
                    "messages": api_messages,
                    "stream": False,
                    "max_tokens": 1024,
                    "temperature": 0.7 if body.context == "general" else 0.6,
                },
            )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Không kết nối được LM Studio: {e}")

    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=r.text or "LM Studio lỗi")

    data = r.json()
    content = (data.get("choices") or [{}])[0].get("message", {}).get("content", "") or REFUSAL_MESSAGE_VI
    return {"message": {"role": "assistant", "content": content}}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5005)
