"""
AI Service – Python: RAG, security, hội thoại đa phương thức (text + hình ảnh).
LLM: Groq Cloud (OpenAI-compatible). Chạy: uvicorn server:app --host 0.0.0.0 --port 5005
"""
import asyncio
import os
from pathlib import Path
from typing import Annotated, Any

from dotenv import load_dotenv

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

# Đọc services/ai/.env (file này nằm trong .gitignore; không commit secret).
load_dotenv(Path(__file__).resolve().parent / ".env")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
GROQ_BASE_URL = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile").strip() or "llama-3.3-70b-versatile"
QUIZ_FAST_MODE = os.environ.get("QUIZ_FAST_MODE", "1") == "1"
QUIZ_MIN_QUESTIONS = max(3, min(5, int(os.environ.get("QUIZ_MIN_QUESTIONS", "3") or "3")))
QUIZ_TARGET_QUESTIONS = max(QUIZ_MIN_QUESTIONS, min(5, int(os.environ.get("QUIZ_TARGET_QUESTIONS", "4") or "4")))
QUIZ_SOURCE_MAX_CHARS = max(1200, int(os.environ.get("QUIZ_SOURCE_MAX_CHARS", "5200") or "5200"))

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


class QuizGenerateRequestBody(BaseModel):
    lesson: dict = Field(default_factory=dict)


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


def _prepend_text_to_user_content(content: Any, prefix: str) -> Any:
    """Chèn prefix (system/RAG đã gộp) vào tin user: chuỗi hoặc block multimodal đầu tiên."""
    if isinstance(content, str):
        return f"{prefix}{content}"
    if isinstance(content, list):
        blocks: list[Any] = list(content)
        for i, block in enumerate(blocks):
            if isinstance(block, dict) and block.get("type") == "text":
                prev = block.get("text") or ""
                blocks[i] = {**block, "text": f"{prefix}{prev}"}
                return blocks
        blocks.insert(0, {"type": "text", "text": prefix.rstrip()})
        return blocks
    return prefix


def _merge_system_for_openrouter(api_messages: list[dict]) -> list[dict]:
    """
    Một số model OpenRouter (vd. Gemma qua Google AI Studio) không hỗ trợ role `system`
    (lỗi: Developer instruction is not enabled). Gộp system vào tin user đầu tiên.
    """
    if not api_messages or api_messages[0].get("role") != "system":
        return api_messages
    system_text = api_messages[0].get("content")
    if not isinstance(system_text, str):
        system_text = str(system_text)
    prefix = system_text.rstrip() + "\n\n---\n\n"
    rest = api_messages[1:]
    merged_first = False
    out: list[dict] = []
    for m in rest:
        if not merged_first and m.get("role") == "user":
            merged_first = True
            out.append(
                {
                    "role": "user",
                    "content": _prepend_text_to_user_content(m.get("content", ""), prefix),
                }
            )
        else:
            out.append(m)
    if not merged_first:
        out.insert(0, {"role": "user", "content": system_text})
    return out


def _provider_targets(has_image: bool) -> list[tuple[str, str, dict[str, str], str]]:
    del has_image
    if not GROQ_API_KEY:
        return []
    return [
        (
            f"{GROQ_BASE_URL}/chat/completions",
            GROQ_MODEL,
            {"Authorization": f"Bearer {GROQ_API_KEY}"},
            "Groq Cloud",
        )
    ]


def _extract_first_json_object(raw: str) -> dict[str, Any] | None:
    text = str(raw or "").strip()
    if not text:
        return None
    if "```" in text:
        # Ưu tiên block code json nếu có
        start = text.find("```")
        end = text.rfind("```")
        if end > start:
            block = text[start + 3 : end].strip()
            if block.lower().startswith("json"):
                block = block[4:].strip()
            text = block
    attempts: list[str] = [text]
    i = text.find("{")
    j = text.rfind("}")
    if i >= 0 and j > i:
        attempts.append(text[i : j + 1])
    for attempt in attempts:
        cleaned = (
            attempt.replace(",}", "}")
            .replace(",]", "]")
            .replace("“", '"')
            .replace("”", '"')
            .replace("‘", "'")
            .replace("’", "'")
        )
        try:
            parsed = __import__("json").loads(cleaned)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            continue
    return None


def _flatten_lesson_text(lesson: dict) -> str:
    title_vi = str(lesson.get("titleVi") or "").strip()
    title = str(lesson.get("title") or "").strip()
    body = str(lesson.get("body") or "").strip()
    sections = lesson.get("sections") if isinstance(lesson.get("sections"), list) else []
    sec_lines: list[str] = []
    for sec in sections:
        if not isinstance(sec, dict):
            continue
        part: list[str] = []
        for k in ("title", "subtitle", "text"):
            v = sec.get(k)
            if v:
                part.append(str(v))
        content = sec.get("content")
        if content:
            part.append(content if isinstance(content, str) else str(content))
        items = sec.get("items")
        if isinstance(items, list):
            part.append("\n".join(str(x or "") for x in items))
        if part:
            sec_lines.append("\n".join(part))
    source = "\n\n".join(x for x in [title_vi or title, "\n\n".join(sec_lines) or body] if x).strip()
    return source


def _normalize_generated_quiz(raw_items: Any, lesson_id: str) -> list[dict[str, Any]]:
    if not isinstance(raw_items, list):
        return []
    out: list[dict[str, Any]] = []
    for idx, q in enumerate(raw_items[:5]):
        if not isinstance(q, dict):
            continue
        question = str(q.get("question") or "").strip()
        options_raw = q.get("options") if isinstance(q.get("options"), list) else []
        options = [str(o or "").strip() for o in options_raw]
        options = [o for o in options if o][:4]
        raw_reasons = q.get("optionExplanations") if isinstance(q.get("optionExplanations"), list) else []
        try:
            ci_raw = int(q.get("correctIndex", 0))
        except Exception:
            ci_raw = 0
        ci = max(0, min(ci_raw, max(0, len(options) - 1)))
        if not question or len(options) < 3:
            continue
        if not options[ci].strip():
            continue
        option_explanations = []
        for i in range(len(options)):
            reason = str(raw_reasons[i] if i < len(raw_reasons) else "").strip()
            if not reason:
                reason = (
                    "Đây là đáp án đúng theo nội dung bài học."
                    if i == ci
                    else "Phương án này chưa khớp với nội dung bài học."
                )
            option_explanations.append(reason)
        out.append(
            {
                "id": str(q.get("id") or "").strip() or f"rq-{lesson_id or 'lesson'}-{idx}",
                "question": question,
                "options": options,
                "correctIndex": ci,
                "optionExplanations": option_explanations,
            }
        )
    return out


def _pick_quiz_items(parsed: dict[str, Any]) -> Any:
    if not isinstance(parsed, dict):
        return None
    if isinstance(parsed.get("quiz"), list):
        return parsed.get("quiz")
    if isinstance(parsed.get("questions"), list):
        return parsed.get("questions")
    if isinstance(parsed.get("items"), list):
        return parsed.get("items")
    return None


def _fallback_quiz_from_source(source: str, lesson_id: str, target: int, min_q: int) -> list[dict[str, Any]]:
    # Fallback an toàn để tránh 422 khi model trả JSON lỗi.
    sents = [x.strip() for x in source.replace("\n", " ").split(".") if x.strip()]
    if not sents:
        sents = [source[:220].strip() or "Nội dung chính của bài học."]
    out: list[dict[str, Any]] = []
    total = max(min_q, min(5, target))
    for i in range(total):
        fact = sents[i % len(sents)]
        fact_short = fact[:180]
        options = [
            f"{fact_short}",
            "Bài học kết luận điều ngược lại hoàn toàn với nội dung trên.",
            "Bài học không đề cập và phủ nhận chủ đề này.",
            "Đây chỉ là nhận định ngoài lề, không liên quan bài học.",
        ]
        out.append(
            {
                "id": f"rq-{lesson_id or 'lesson'}-fb-{i}",
                "question": f"Theo bài học, nhận định nào đúng nhất ({i+1})?",
                "options": options,
                "correctIndex": 0,
                "optionExplanations": [
                    "Đúng: phương án này bám sát nội dung bài học.",
                    "Sai: phương án này mâu thuẫn với nội dung bài học.",
                    "Sai: bài học không khẳng định như phương án này.",
                    "Sai: đây là diễn giải không đúng trọng tâm bài học.",
                ],
            }
        )
    return out


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai",
        "rag": USE_RAG,
        "llm": "groq_cloud",
    }


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
    provider_errors: list[str] = []
    r = None
    for (url, llm_model, llm_headers, llm_label) in _provider_targets(bool(body.image_base64)):
        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                payload: dict[str, Any] = {
                    "model": llm_model,
                    "messages": api_messages,
                    "stream": False,
                    "max_tokens": 1024,
                    "temperature": temp,
                }
                if tools:
                    payload["tools"] = tools
                    payload["tool_choice"] = "auto"
                r_try = await client.post(url, json=payload, headers=llm_headers)
                if r_try.status_code >= 400 and tools:
                    payload.pop("tools", None)
                    payload.pop("tool_choice", None)
                    r_try = await client.post(url, json=payload, headers=llm_headers)
                if r_try.status_code == 200:
                    r = r_try
                    break
                provider_errors.append(f"{llm_label}:{r_try.status_code}:{(r_try.text or '').strip()[:300]}")
        except Exception as e:
            provider_errors.append(f"{llm_label}:connect:{e}")

    if r is None:
        detail = " | ".join(provider_errors) if provider_errors else "Không có provider khả dụng"
        raise HTTPException(status_code=502, detail=detail)

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


@app.post("/quiz/generate")
async def generate_quiz(body: QuizGenerateRequestBody):
    lesson = body.lesson or {}
    lesson_id = str(lesson.get("id") or "").strip()
    source = _flatten_lesson_text(lesson)
    if not source or len(source) < 120:
        raise HTTPException(status_code=400, detail="Nội dung bài học còn quá ngắn để sinh quiz tự động")

    system_prompt = (
        "Bạn là giáo viên thiên văn học. Tạo quiz kiểm tra hiểu bài bằng tiếng Việt, rõ ràng, không đánh đố, "
        "chỉ bám nội dung bài. Trả JSON hợp lệ."
    )
    user_prompt = "\n".join(
        [
            f"Tạo {QUIZ_TARGET_QUESTIONS} câu trắc nghiệm một đáp án đúng.",
            "Mỗi câu có đúng 4 options.",
            'Không dùng phương án "Tất cả đều đúng/đều sai".',
            "Phân bố vị trí correctIndex ngẫu nhiên.",
            "Đầu ra bắt buộc:",
            '{"quiz":[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"optionExplanations":["...","...","...","..."]}]}',
            "",
            f"lesson_id: {lesson_id or 'unknown'}",
            f"lesson_title_vi: {str(lesson.get('titleVi') or '').strip()}",
            f"lesson_title_en: {str(lesson.get('title') or '').strip()}",
            "lesson_content:",
            source[:QUIZ_SOURCE_MAX_CHARS],
        ]
    )

    async def _call_once(user_prompt_input: str) -> tuple[list[dict[str, Any]], list[str]]:
        targets = _provider_targets(False)
        payload: dict[str, Any] = {
            "model": "",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt_input},
            ],
            "stream": False,
            "max_tokens": 520 if QUIZ_FAST_MODE else 900,
            "temperature": 0.1 if QUIZ_FAST_MODE else 0.2,
        }
        provider_errors_local: list[str] = []
        r = None
        for (url, llm_model, llm_headers, llm_label) in targets:
            try:
                async with httpx.AsyncClient(timeout=90.0) as client:
                    p = dict(payload)
                    p["model"] = llm_model
                    p["response_format"] = {"type": "json_object"}
                    r_try = await client.post(url, json=p, headers=llm_headers)
                    if r_try.status_code == 200:
                        r = r_try
                        break
                    provider_errors_local.append(f"{llm_label}:{r_try.status_code}:{(r_try.text or '').strip()[:400]}")
            except Exception as e:
                provider_errors_local.append(f"{llm_label}:connect:{e}")

        if r is None:
            return [], provider_errors_local
        data = r.json()
        msg = (data.get("choices") or [{}])[0].get("message") or {}
        raw_content = msg.get("content")
        content = raw_content if isinstance(raw_content, str) else str(raw_content or "")
        parsed = _extract_first_json_object(content) or {}
        return _normalize_generated_quiz(_pick_quiz_items(parsed), lesson_id), provider_errors_local

    quiz, provider_errors = await _call_once(user_prompt)
    if len(quiz) < QUIZ_MIN_QUESTIONS:
        strict_retry_prompt = (
            user_prompt
            + f"\n\nBẮT BUỘC: Trả về JSON object duy nhất, key quiz là mảng gồm đúng {QUIZ_TARGET_QUESTIONS} câu; "
            "mỗi câu có question (string), options (mảng 4 string khác nhau), correctIndex (0..3), optionExplanations (4 chuỗi theo A-D). "
            "Không thêm giải thích ngoài JSON."
        )
        quiz_retry, provider_errors_retry = await _call_once(strict_retry_prompt)
        provider_errors.extend(provider_errors_retry)
        if len(quiz_retry) >= len(quiz):
            quiz = quiz_retry
    if not quiz and provider_errors:
        raise HTTPException(status_code=502, detail=" | ".join(provider_errors))
    if len(quiz) < QUIZ_MIN_QUESTIONS:
        quiz = _fallback_quiz_from_source(source, lesson_id, QUIZ_TARGET_QUESTIONS, QUIZ_MIN_QUESTIONS)
    return {"recallQuiz": quiz}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5005)
