"""
AI Service – Python: RAG, security, hội thoại đa phương thức (text + hình ảnh).
LLM: Groq Cloud (OpenAI-compatible). Chạy: uvicorn server:app --host 0.0.0.0 --port 5005
"""
import asyncio
import json
import os
import time
from pathlib import Path
from typing import Annotated, Any, AsyncIterator

from dotenv import load_dotenv

import httpx
import knowledge_pipeline as kp
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agent_tools import (
    USE_AGENT_TOOLS,
    extract_tool_calls_from_response,
    tools_for_context,
    validate_and_normalize_tool_calls,
)
from llm_providers import build_provider_chain, provider_chain_status, should_fallback_to_next_provider
from rag import reload_index, retrieve
from security import REFUSAL_MESSAGE_VI, is_request_blocked

# Đọc services/ai/.env (file này nằm trong .gitignore; không commit secret).
load_dotenv(Path(__file__).resolve().parent / ".env")

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


def build_learning_path_system(lp: dict) -> str:
    title = lp.get("currentLessonTitle") or "bài hiện tại"
    sections = lp.get("sectionTitles") or []
    sec_txt = ", ".join(str(s) for s in sections[:6]) if sections else ""
    core = f"""Bạn là AI Learning Agent trên lộ trình học Galaxies.
Người học đang xem bài: "{title}" (id={lp.get("currentLessonId", "")}).
Mục lục: {sec_txt or "(chưa có)"}.
Depth: {lp.get("depth") or "beginner"}.
Trả lời tiếng Việt, bám nội dung bài đang học.
Khi người học vừa trượt quiz ôn tập: coach Socratic — hỏi gợi mở, không nêu thẳng đáp án trắc nghiệm."""
    if USE_AGENT_TOOLS:
        return (
            core
            + "\nTool: open_learning_path_lesson(lesson_id), navigate_to_narrative / go_to_explore(stage_time_ma), "
            "suggest_depth_switch(suggested_depth, reason) — depth chỉ gợi ý, không tự đổi."
        )
    return core


def build_explore_system() -> str:
    base = (
        SYSTEM_GENERAL
        + "\n\nNgười dùng đang ở màn Khám phá 3D / timeline."
        + " Khi có danh sách hóa thạch từ CSDL trong ngữ cảnh, chỉ nhắc tên loài cụ thể trong danh sách đó."
        + " Khi user muốn di chuyển/xem hành tinh hoặc vệ tinh trên quỹ đạo (vd. Venus, Europa),"
        + " gọi focus_showcase_entity với planet_name hoặc entity_name/entity_id từ showcase_context."
        + " Timeline Trái Đất: go_to_explore(stage_time_ma). Liệt kê entity theo hành tinh từ showcase_context."
    )
    if USE_AGENT_TOOLS:
        return (
            base
            + "\nTool: focus_showcase_entity(planet_name | entity_name | entity_id),"
            " navigate_to_narrative / go_to_explore(stage_time_ma) — timeline Ma."
        )
    return base


def build_general_system() -> str:
    if USE_AGENT_TOOLS:
        return (
            SYSTEM_GENERAL
            + "\n\nBạn có tool: navigate_to_narrative / go_to_explore, open_courses, open_dashboard, open_my_courses — "
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
    if state.planet:
        parts.append(f"Hành tinh / khung khám phá: {state.planet}")
    if state.stage_time_ma is not None:
        parts.append(f"Thời điểm timeline: ~{state.stage_time_ma} triệu năm trước (Ma)")
    if state.lesson_id:
        parts.append(f"Bài học: {state.lesson_title or state.lesson_id}")
    active = getattr(state, "active_section", None)
    if isinstance(active, dict) and active.get("title"):
        excerpt = active.get("excerpt") or ""
        parts.append(
            f"Mục đang đọc: {active.get('title')}"
            + (f" — {excerpt[:280]}" if excerpt else "")
        )
    narrative = getattr(state, "narrative_context", None)
    if isinstance(narrative, dict) and narrative.get("entity_id"):
        beat = narrative.get("beat_title") or narrative.get("entity_id")
        summary = narrative.get("beat_summary") or ""
        parts.append(f"Khám phá / narrative: {beat}" + (f" — {summary[:200]}" if summary else ""))
        conf = narrative.get("confidence")
        if conf:
            parts.append(f"Độ tin cậy khoa học (beat): {conf}")
        disclaimer = narrative.get("confidence_disclaimer_vi") or narrative.get(
            "confidenceDisclaimerVi"
        )
        if isinstance(disclaimer, str) and disclaimer.strip():
            parts.append(disclaimer.strip()[:240])
    deep_disc = getattr(state, "deep_history_disclaimer", None)
    if isinstance(deep_disc, str) and deep_disc.strip() and deep_disc not in (parts[-1] if parts else ""):
        parts.append(deep_disc.strip()[:240])
    cohort = getattr(state, "active_cohort", None)
    if isinstance(cohort, dict) and cohort.get("cohort_title"):
        pending = cohort.get("pending_assignments", cohort.get("pendingAssignments"))
        deadlines = cohort.get("upcoming_deadlines") or cohort.get("upcomingDeadlines") or []
        line = f"Lớp cohort: {cohort.get('cohort_title') or cohort.get('cohortTitle')}"
        if pending:
            line += f" — {pending} bài tập chưa nộp"
        if isinstance(deadlines, list) and deadlines:
            titles = [
                str(d.get("title") or d.get("lesson_slug") or "")
                for d in deadlines[:2]
                if isinstance(d, dict)
            ]
            titles = [t for t in titles if t]
            if titles:
                line += f"; deadline sắp tới: {', '.join(titles)}"
        parts.append(line)
    concept_graph = getattr(state, "concept_graph", None)
    if isinstance(concept_graph, dict):
        missing = concept_graph.get("missing_prerequisites") or concept_graph.get(
            "missingPrerequisites"
        )
        if isinstance(missing, list) and missing:
            labels = [
                str(m.get("title") or m.get("concept_id") or m.get("conceptId"))
                for m in missing[:3]
                if isinstance(m, dict)
            ]
            labels = [x for x in labels if x]
            if labels:
                parts.append(f"Tiên quyết chưa đủ: {', '.join(labels)}")
    economy = getattr(state, "learner_economy", None)
    if isinstance(economy, dict) and (
        economy.get("learner_tier") or economy.get("learnerTier")
    ):
        tier = economy.get("learner_tier") or economy.get("learnerTier") or {}
        if isinstance(tier, dict) and (tier.get("name_vi") or tier.get("nameVi")):
            name = tier.get("name_vi") or tier.get("nameVi")
            emoji = tier.get("emoji") or ""
            parts.append(f"Hạng học viên: {emoji} {name}".strip())
        balance = economy.get("gem_balance", economy.get("gemBalance"))
        if balance is not None:
            parts.append(f"Số dư gem: {balance}")
        unlocks = economy.get("nearby_unlocks") or economy.get("nearbyUnlocks")
        if isinstance(unlocks, list) and unlocks:
            labels = [
                str(u.get("label_vi") or u.get("labelVi") or "")
                for u in unlocks[:2]
                if isinstance(u, dict)
            ]
            labels = [x for x in labels if x]
            if labels:
                parts.append(f"Gần đủ gem mở: {', '.join(labels)}")
    studio = getattr(state, "studio_assist", None)
    if isinstance(studio, dict) and studio.get("mode"):
        hints = studio.get("hints") or []
        title = studio.get("course_title") or studio.get("courseTitle")
        if title:
            parts.append(f"Studio — khóa: {title}")
        if isinstance(hints, list) and hints:
            parts.append(str(hints[0])[:200])
    spaced = getattr(state, "spaced_review_due", None)
    if isinstance(spaced, list) and spaced:
        titles = [
            str(x.get("title") or x.get("lessonId"))
            for x in spaced[:3]
            if isinstance(x, dict)
        ]
        if titles:
            parts.append(f"Bài nên ôn lại (spaced review): {', '.join(titles)}")
    depth_sug = getattr(state, "depth_suggestion", None)
    if isinstance(depth_sug, dict) and depth_sug.get("suggested_depth"):
        parts.append(
            f"Gợi ý depth (chờ user xác nhận): {depth_sug.get('suggested_depth')} — {depth_sug.get('reason', '')[:120]}"
        )
    earth_fossil = getattr(state, "earth_fossil_context", None)
    if isinstance(earth_fossil, dict):
        stage_name = earth_fossil.get("stage_name") or earth_fossil.get("stageName")
        stage_ma = earth_fossil.get("stage_time_ma", earth_fossil.get("stageTimeMa"))
        if stage_ma is None:
            stage_ma = state.stage_time_ma
        period = earth_fossil.get("period")
        era = earth_fossil.get("era")
        time_range = earth_fossil.get("time_range") or earth_fossil.get("timeRange") or {}
        stage_line = "Trái Đất — giai đoạn timeline"
        if stage_name:
            stage_line += f": {stage_name}"
        if stage_ma is not None:
            stage_line += f" (~{stage_ma} Ma)"
        if period or era:
            stage_line += f" [{', '.join(x for x in [era, period] if x)}]"
        if isinstance(time_range, dict) and time_range.get("maxMa") is not None:
            stage_line += (
                f"; cửa sổ hóa thạch CSDL: {time_range.get('minMa')}–{time_range.get('maxMa')} Ma"
            )
        total = earth_fossil.get("total_in_db", earth_fossil.get("totalInDb"))
        if total is not None:
            stage_line += f"; ~{total} bản ghi trong CSDL"
        parts.append(stage_line)
        top_phyla = earth_fossil.get("top_phyla") or earth_fossil.get("topPhyla") or []
        if isinstance(top_phyla, list) and top_phyla:
            phyla_labels = []
            for row in top_phyla[:8]:
                if not isinstance(row, dict):
                    continue
                name = row.get("phylum")
                if not name:
                    continue
                count = row.get("count")
                phyla_labels.append(f"{name} ({count})" if count is not None else str(name))
            if phyla_labels:
                parts.append(f"Ngạnh phổ biến trong CSDL: {', '.join(phyla_labels)}")
        notable = earth_fossil.get("notable_fossils") or earth_fossil.get("notableFossils") or []
        if isinstance(notable, list) and notable:
            fossil_lines = []
            for item in notable[:20]:
                if not isinstance(item, dict):
                    continue
                name = item.get("name")
                if not name:
                    continue
                bits = [str(name)]
                phylum = item.get("phylum")
                if phylum:
                    bits.append(f"ngạnh {phylum}")
                env = item.get("environment")
                if env:
                    bits.append(str(env))
                fossil_lines.append(" — ".join(bits))
            if fossil_lines:
                parts.append(
                    "Hóa thạch tiêu biểu có trong CSDL (chỉ được nhắc tên cụ thể từ danh sách này): "
                    + "; ".join(fossil_lines)
                )
        note = earth_fossil.get("grounding_note_vi") or earth_fossil.get("groundingNoteVi")
        if isinstance(note, str) and note.strip():
            parts.append(note.strip())
    showcase = getattr(state, "showcase_context", None)
    if isinstance(showcase, dict):
        active_name = showcase.get("active_entity_name") or showcase.get("activeEntityName")
        active_id = showcase.get("active_entity_id") or showcase.get("activeEntityId")
        if active_id:
            line = f"Showcase đang focus: {active_name or active_id} ({active_id})"
            linked = showcase.get("active_linked_planet") or showcase.get("activeLinkedPlanet")
            if linked:
                line += f" — quỹ đạo {linked}"
            parts.append(line)
        planets = showcase.get("planets") or []
        if isinstance(planets, list) and planets:
            catalog_lines = []
            for row in planets[:8]:
                if not isinstance(row, dict):
                    continue
                planet = row.get("planet")
                pid = row.get("entity_id") or row.get("entityId")
                children = row.get("moons_and_orbiters") or row.get("moonsAndOrbiters") or []
                child_names = []
                if isinstance(children, list):
                    for c in children[:8]:
                        if isinstance(c, dict) and c.get("name"):
                            child_names.append(str(c.get("name")))
                chunk = f"{planet} ({pid})"
                if child_names:
                    chunk += f": {', '.join(child_names)}"
                catalog_lines.append(chunk)
            if catalog_lines:
                parts.append("Catalog showcase theo hành tinh: " + " | ".join(catalog_lines))
        hint = showcase.get("navigation_hint_vi") or showcase.get("navigationHintVi")
        if isinstance(hint, str) and hint.strip():
            parts.append(hint.strip()[:280])
    if state.weak_lessons:
        weak_ids = [w.get("lessonId") for w in state.weak_lessons[:3] if isinstance(w, dict)]
        if weak_ids:
            parts.append(f"Bài đang khó / cần ôn (tín hiệu hệ thống): {', '.join(str(x) for x in weak_ids)}")
    if state.misconceptions:
        tags = [m.get("tag") for m in state.misconceptions[-5:] if isinstance(m, dict) and m.get("tag")]
        if tags:
            parts.append(f"Hiểu lầm đã ghi nhận: {'; '.join(str(t) for t in tags)}")
    if not parts:
        return system
    block = "\n".join(parts)
    extra = ""
    coach_trigger = getattr(state, "coach_trigger", None)
    if coach_trigger == "quiz_failed":
        extra = (
            "\nChế độ coach: người học VỪA trượt quiz ôn trong phiên này. "
            "Dùng phong cách Socratic — gợi ý từng bước, không đưa đáp án MCQ trực tiếp. "
            "Không nói họ đã trượt nếu họ chưa làm quiz.\n"
        )
    elif state.misconceptions or state.weak_lessons:
        extra = (
            "\nCó tín hiệu học tập từ các phiên trước; không giả định vừa trượt quiz "
            "trừ khi học viên nói rõ hoặc coach_trigger là quiz_failed.\n"
        )
    return system.rstrip() + "\n\n[Hành vi / ngữ cảnh học]\n" + block + extra + "\n"


class ChatMessage(BaseModel):
    role: str
    content: str | list[dict[str, Any]] = Field(default="")


class AgentStateBody(BaseModel):
    """Ngữ cảnh UI do client gửi — giúp agent hiểu hành vi / trang đang xem."""

    pathname: str | None = None
    search: str | None = None
    route_label: str | None = None
    lesson_id: str | None = None
    lesson_title: str | None = None
    module_id: str | None = None
    node_id: str | None = None
    depth: str | None = None
    planet: str | None = None
    stage_time_ma: float | None = None
    current_lesson: dict | None = None
    weak_lessons: list[dict] | None = None
    misconceptions: list[dict] | None = None
    coach_trigger: str | None = None
    recall_quiz_available: bool | None = None
    active_section: dict | None = None
    narrative_context: dict | None = None
    spaced_review_due: list[dict] | None = None
    depth_suggestion: dict | None = None
    entity_id: str | None = None
    active_cohort: dict | None = None
    concept_graph: dict | None = None
    learner_economy: dict | None = None
    studio_assist: dict | None = None
    deep_history_disclaimer: str | None = None
    earth_fossil_context: dict | None = None
    showcase_context: dict | None = None


class ChatRequestBody(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)
    context: str = "general"
    course: dict | None = None
    learning_path: dict | None = None
    image_base64: str | None = None
    image_media_type: str = "image/jpeg"
    agent_state: AgentStateBody | None = None
    allowed_tools: list[str] | None = None
    rag_timeout_ms: int = Field(default=3000, ge=500, le=15000)
    rag_lesson_id: str | None = Field(None, max_length=120)


class KnowledgeAppendBody(BaseModel):
    text: str = Field(..., min_length=8, max_length=32000)
    source: str | None = Field(None, max_length=240)


class KnowledgeDeletePrefixBody(BaseModel):
    source_prefix: str = Field(..., min_length=2, max_length=240)


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


async def _complete_chat(
    api_messages: list[dict],
    *,
    has_image: bool,
    temperature: float,
    max_tokens: int,
    tools: list[dict[str, Any]] | None = None,
    response_format: dict[str, str] | None = None,
) -> tuple[httpx.Response | None, str | None, list[str]]:
    """Thử lần lượt OpenRouter → LM Studio → Groq (theo LLM_PROVIDER_ORDER)."""
    chain = build_provider_chain(has_image)
    if not chain:
        return (
            None,
            None,
            [
                "Không có LLM provider — đặt OPENROUTER_API_KEY và/hoặc LM_STUDIO_MODEL "
                "(LM Studio local server phải đang chạy)."
            ],
        )

    provider_errors: list[str] = []
    async with httpx.AsyncClient(timeout=90.0) as client:
        for idx, provider in enumerate(chain):
            msgs = (
                _merge_system_for_openrouter(api_messages)
                if provider.merge_system_into_user
                else api_messages
            )
            payload: dict[str, Any] = {
                "model": provider.model,
                "messages": msgs,
                "stream": False,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            if response_format:
                payload["response_format"] = response_format
            if tools:
                payload["tools"] = tools
                payload["tool_choice"] = "auto"
            try:
                r_try = await client.post(
                    provider.chat_completions_url,
                    json=payload,
                    headers=provider.request_headers(),
                )
                if tools and r_try.status_code >= 400:
                    payload_plain = {k: v for k, v in payload.items() if k not in ("tools", "tool_choice")}
                    r_try = await client.post(
                        provider.chat_completions_url,
                        json=payload_plain,
                        headers=provider.request_headers(),
                    )
                if r_try.status_code == 200:
                    return r_try, provider.label, provider_errors

                err_snip = (r_try.text or "").strip()[:300]
                provider_errors.append(f"{provider.label}:{r_try.status_code}:{err_snip}")
                if idx < len(chain) - 1 and should_fallback_to_next_provider(
                    r_try.status_code, r_try.text or ""
                ):
                    continue
            except Exception as e:
                provider_errors.append(f"{provider.label}:connect:{e}")
                if idx < len(chain) - 1:
                    continue

    return None, None, provider_errors


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
        "llm": provider_chain_status(),
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


@app.post("/knowledge/delete-prefix")
async def knowledge_delete_prefix(
    body: KnowledgeDeletePrefixBody,
    _: Annotated[None, Depends(require_knowledge_admin)],
):
    """Xóa chunk theo source prefix (vd. lp/{lessonId} trước khi re-append)."""
    async with _knowledge_lock:
        result = kp.delete_chunks_by_source_prefix(body.source_prefix)
        if not result.get("ok"):
            raise HTTPException(status_code=400, detail=result.get("error", "delete failed"))
        reload_index()
    return result


@app.post("/chat")
async def chat(body: ChatRequestBody):
    messages = [m.model_dump() for m in body.messages]
    if is_request_blocked(messages):
        return {"message": {"role": "assistant", "content": REFUSAL_MESSAGE_VI}}

    rag_ms: float | None = None
    if body.context == "course" and body.course:
        base_system = build_course_system(body.course)
    elif body.context == "learning_path" and body.learning_path:
        base_system = build_learning_path_system(body.learning_path)
    elif body.context == "explore":
        base_system = build_explore_system()
    else:
        base_system = build_general_system()

    system_content = augment_system_with_agent_state(base_system, body.agent_state)

    if USE_RAG:
        query = _last_user_text(messages)
        if query:
            timeout_s = body.rag_timeout_ms / 1000.0
            try:
                t_rag = time.perf_counter()
                lesson_id = body.rag_lesson_id
                if not lesson_id and body.agent_state:
                    lesson_id = body.agent_state.lesson_id
                chunks = await asyncio.wait_for(
                    retrieve(query, lesson_id=lesson_id),
                    timeout=timeout_s,
                )
                rag_ms = (time.perf_counter() - t_rag) * 1000.0
            except asyncio.TimeoutError:
                chunks = []
                system_content = (
                    system_content.rstrip()
                    + "\n\n[RAG timeout — trả lời từ ngữ cảnh bài học và kiến thức chung, không bịa số liệu cụ thể.]\n"
                )
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
    tools = (
        tools_for_context(body.context, body.allowed_tools) if use_tools else None
    )
    temp = 0.7 if body.context == "general" else 0.6
    r, llm_provider_used, provider_errors = await _complete_chat(
        api_messages,
        has_image=bool(body.image_base64),
        temperature=temp,
        max_tokens=1024,
        tools=tools,
    )

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
        validate_and_normalize_tool_calls(
            body.context, body.course, raw_tc, body.learning_path
        )
        if raw_tc
        else []
    )

    if not content and validated:
        content = "Mình đã chọn thao tác phù hợp — bạn có thể bấm nút bên dưới."
    elif not content and not validated:
        content = REFUSAL_MESSAGE_VI

    out: dict[str, Any] = {"message": {"role": "assistant", "content": content}}
    if llm_provider_used:
        out["llm_provider"] = llm_provider_used
    if validated:
        out["tool_calls"] = validated
    if rag_ms is not None:
        out["rag_ms"] = round(rag_ms, 1)
    return out


def _sse_line(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def _stream_llm_tokens(
    api_messages: list[dict],
    *,
    has_image: bool,
    temperature: float,
    max_tokens: int,
    tools: list[dict[str, Any]] | None,
) -> AsyncIterator[dict[str, Any]]:
    """Yield {kind: token|tools_raw|provider|error, ...} from first working provider."""
    chain = build_provider_chain(has_image)
    if not chain:
        yield {"kind": "error", "message": "Không có LLM provider khả dụng"}
        return

    provider_errors: list[str] = []
    async with httpx.AsyncClient(timeout=90.0) as client:
        for idx, provider in enumerate(chain):
            msgs = (
                _merge_system_for_openrouter(api_messages)
                if provider.merge_system_into_user
                else api_messages
            )
            payload: dict[str, Any] = {
                "model": provider.model,
                "messages": msgs,
                "stream": True,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            if tools:
                payload["tools"] = tools
                payload["tool_choice"] = "auto"
            try:
                async with client.stream(
                    "POST",
                    provider.chat_completions_url,
                    json=payload,
                    headers=provider.request_headers(),
                ) as r:
                    if r.status_code != 200:
                        err_snip = (await r.aread()).decode("utf-8", errors="replace")[:300]
                        provider_errors.append(f"{provider.label}:{r.status_code}:{err_snip}")
                        if idx < len(chain) - 1 and should_fallback_to_next_provider(
                            r.status_code, err_snip
                        ):
                            continue
                        yield {
                            "kind": "error",
                            "message": " | ".join(provider_errors) or "LLM stream failed",
                        }
                        return

                    tool_acc: dict[int, dict[str, Any]] = {}
                    async for line in r.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        raw = line[6:].strip()
                        if raw == "[DONE]":
                            break
                        try:
                            chunk = json.loads(raw)
                        except json.JSONDecodeError:
                            continue
                        choices = chunk.get("choices")
                        if not isinstance(choices, list) or not choices:
                            continue
                        delta = (choices[0] or {}).get("delta") or {}
                        piece = delta.get("content")
                        if isinstance(piece, str) and piece:
                            yield {"kind": "token", "content": piece}
                        for td in delta.get("tool_calls") or []:
                            if not isinstance(td, dict):
                                continue
                            i = int(td.get("index", 0))
                            acc = tool_acc.setdefault(
                                i,
                                {
                                    "id": "",
                                    "type": "function",
                                    "function": {"name": "", "arguments": ""},
                                },
                            )
                            if td.get("id"):
                                acc["id"] = td["id"]
                            fn = td.get("function") or {}
                            if isinstance(fn, dict):
                                if fn.get("name"):
                                    acc["function"]["name"] += str(fn["name"])
                                if fn.get("arguments"):
                                    acc["function"]["arguments"] += str(fn["arguments"])

                    yield {"kind": "provider", "label": provider.label}
                    yield {"kind": "tools_raw", "tool_calls": list(tool_acc.values())}
                    return
            except Exception as e:
                provider_errors.append(f"{provider.label}:connect:{e}")
                if idx < len(chain) - 1:
                    continue

    yield {
        "kind": "error",
        "message": " | ".join(provider_errors) if provider_errors else "LLM stream failed",
    }


async def _chat_stream_generator(body: ChatRequestBody) -> AsyncIterator[str]:
    messages = [m.model_dump() for m in body.messages]
    if is_request_blocked(messages):
        yield _sse_line("token", {"content": REFUSAL_MESSAGE_VI})
        yield _sse_line(
            "done",
            {"message": {"role": "assistant", "content": REFUSAL_MESSAGE_VI}, "tool_calls": []},
        )
        return

    rag_ms: float | None = None
    if body.context == "course" and body.course:
        base_system = build_course_system(body.course)
    elif body.context == "learning_path" and body.learning_path:
        base_system = build_learning_path_system(body.learning_path)
    elif body.context == "explore":
        base_system = build_explore_system()
    else:
        base_system = build_general_system()

    system_content = augment_system_with_agent_state(base_system, body.agent_state)

    if USE_RAG:
        query = _last_user_text(messages)
        if query:
            timeout_s = body.rag_timeout_ms / 1000.0
            try:
                t_rag = time.perf_counter()
                lesson_id = body.rag_lesson_id
                if not lesson_id and body.agent_state:
                    lesson_id = body.agent_state.lesson_id
                chunks = await asyncio.wait_for(
                    retrieve(query, lesson_id=lesson_id),
                    timeout=timeout_s,
                )
                rag_ms = (time.perf_counter() - t_rag) * 1000.0
            except asyncio.TimeoutError:
                chunks = []
                system_content = (
                    system_content.rstrip()
                    + "\n\n[RAG timeout — trả lời từ ngữ cảnh bài học và kiến thức chung, không bịa số liệu cụ thể.]\n"
                )
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
    tools = (
        tools_for_context(body.context, body.allowed_tools) if use_tools else None
    )
    temp = 0.7 if body.context == "general" else 0.6

    if body.image_base64:
        r, llm_provider_used, provider_errors = await _complete_chat(
            api_messages,
            has_image=True,
            temperature=temp,
            max_tokens=1024,
            tools=None,
        )
        if r is None:
            detail = " | ".join(provider_errors) if provider_errors else "Không có provider"
            yield _sse_line("error", {"error": detail})
            return
        data = r.json()
        msg = (data.get("choices") or [{}])[0].get("message") or {}
        content = (msg.get("content") or "").strip() if isinstance(msg.get("content"), str) else ""
        if content:
            yield _sse_line("token", {"content": content})
        yield _sse_line(
            "done",
            {
                "message": {"role": "assistant", "content": content},
                "tool_calls": [],
                "rag_ms": round(rag_ms, 1) if rag_ms is not None else None,
                "llm_provider": llm_provider_used,
            },
        )
        return

    content_parts: list[str] = []
    tools_raw: list[dict[str, Any]] = []
    llm_provider_used: str | None = None

    async for ev in _stream_llm_tokens(
        api_messages,
        has_image=False,
        temperature=temp,
        max_tokens=1024,
        tools=tools,
    ):
        kind = ev.get("kind")
        if kind == "token":
            piece = ev.get("content") or ""
            if piece:
                content_parts.append(piece)
                yield _sse_line("token", {"content": piece})
        elif kind == "tools_raw":
            tools_raw = ev.get("tool_calls") or []
        elif kind == "provider":
            llm_provider_used = ev.get("label")
        elif kind == "error":
            yield _sse_line("error", {"error": ev.get("message", "LLM stream failed")})
            return

    content = "".join(content_parts).strip()
    validated = (
        validate_and_normalize_tool_calls(
            body.context, body.course, tools_raw, body.learning_path
        )
        if tools_raw
        else []
    )
    if not content and validated:
        content = "Mình đã chọn thao tác phù hợp — bạn có thể bấm nút bên dưới."
    elif not content and not validated:
        content = REFUSAL_MESSAGE_VI

    done_payload: dict[str, Any] = {
        "message": {"role": "assistant", "content": content},
        "tool_calls": validated,
    }
    if llm_provider_used:
        done_payload["llm_provider"] = llm_provider_used
    if rag_ms is not None:
        done_payload["rag_ms"] = round(rag_ms, 1)
    yield _sse_line("done", done_payload)


@app.post("/chat/stream")
async def chat_stream(body: ChatRequestBody):
    """SSE: event token {content} … event done {message, tool_calls, rag_ms}."""
    return StreamingResponse(
        _chat_stream_generator(body),
        media_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


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
        quiz_messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt_input},
        ]
        r, _provider_label, provider_errors_local = await _complete_chat(
            quiz_messages,
            has_image=False,
            temperature=0.1 if QUIZ_FAST_MODE else 0.2,
            max_tokens=520 if QUIZ_FAST_MODE else 900,
            response_format={"type": "json_object"},
        )

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
