"""
Định nghĩa tool (function calling) cho AI Agent — điều hướng app an toàn, có validate.
Node orchestrator authorize lần cuối; Python lọc shape cơ bản.
"""
from __future__ import annotations

import json
import os
from typing import Any

USE_AGENT_TOOLS = os.environ.get("USE_AGENT_TOOLS", "1") == "1"

STAGE_TIME_MIN_MA = -2000.0
STAGE_TIME_MAX_MA = 4600.0
DEPTH_VALUES = frozenset({"beginner", "explorer", "researcher"})

_EXPLORE_NAV = {
    "type": "function",
    "function": {
        "name": "navigate_to_narrative",
        "description": "Mở Khám phá / narrative 3D tại thời điểm Ma (Trái Đất hoặc hành tinh).",
        "parameters": {
            "type": "object",
            "properties": {
                "planet": {"type": "string", "description": "earth | mars | showcase"},
                "stage_time_ma": {"type": "number", "description": "Thời gian Ma"},
                "pin_id": {"type": "string"},
                "entity_id": {"type": "string"},
            },
            "required": ["stage_time_ma"],
        },
    },
}

_GO_EXPLORE_ALIAS = {
    "type": "function",
    "function": {
        "name": "go_to_explore",
        "description": "Alias: mở Khám phá tại thời điểm Ma.",
        "parameters": {
            "type": "object",
            "properties": {
                "stage_time_ma": {"type": "number", "description": "Thời gian Ma"},
            },
            "required": ["stage_time_ma"],
        },
    },
}

_OPEN_LP_LESSON = {
    "type": "function",
    "function": {
        "name": "open_learning_path_lesson",
        "description": "Mở bài trong lộ trình học (learning path) theo lesson_id.",
        "parameters": {
            "type": "object",
            "properties": {
                "lesson_id": {"type": "string", "description": "ID bài trong curriculum LP"},
            },
            "required": ["lesson_id"],
        },
    },
}

_HIGHLIGHT_CONCEPT = {
    "type": "function",
    "function": {
        "name": "highlight_concept_in_map",
        "description": "Mở bản đồ concept và highlight một concept.",
        "parameters": {
            "type": "object",
            "properties": {"concept_id": {"type": "string"}},
            "required": ["concept_id"],
        },
    },
}

_RELATED_LESSONS = {
    "type": "function",
    "function": {
        "name": "show_related_lessons",
        "description": "Gợi ý tối đa 3 bài LP liên quan (concept hoặc bài hiện tại).",
        "parameters": {
            "type": "object",
            "properties": {
                "concept_id": {"type": "string"},
                "lesson_id": {"type": "string"},
            },
        },
    },
}

_START_RECALL = {
    "type": "function",
    "function": {
        "name": "start_recall_quiz",
        "description": "Mở quiz ôn tập cho bài LP.",
        "parameters": {
            "type": "object",
            "properties": {"lesson_id": {"type": "string"}},
            "required": ["lesson_id"],
        },
    },
}

_SUGGEST_DEPTH = {
    "type": "function",
    "function": {
        "name": "suggest_depth_switch",
        "description": "Gợi ý đổi mức depth (beginner/explorer/researcher); user phải xác nhận.",
        "parameters": {
            "type": "object",
            "properties": {
                "suggested_depth": {
                    "type": "string",
                    "enum": ["beginner", "explorer", "researcher"],
                },
                "reason": {"type": "string"},
            },
            "required": ["suggested_depth", "reason"],
        },
    },
}

COURSE_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "open_lesson",
            "description": "Mở bài trong khóa học (slug trong danh sách).",
            "parameters": {
                "type": "object",
                "properties": {
                    "lesson_slug": {"type": "string"},
                },
                "required": ["lesson_slug"],
            },
        },
    },
    _GO_EXPLORE_ALIAS,
    _EXPLORE_NAV,
]

LEARNING_PATH_TOOLS: list[dict[str, Any]] = [
    _OPEN_LP_LESSON,
    _GO_EXPLORE_ALIAS,
    _EXPLORE_NAV,
    _SUGGEST_DEPTH,
    _HIGHLIGHT_CONCEPT,
    _RELATED_LESSONS,
    _START_RECALL,
]

EXPLORE_TOOLS: list[dict[str, Any]] = [
    _EXPLORE_NAV,
    _GO_EXPLORE_ALIAS,
    _OPEN_LP_LESSON,
    _RELATED_LESSONS,
    _HIGHLIGHT_CONCEPT,
]

GENERAL_TOOLS: list[dict[str, Any]] = [
    _GO_EXPLORE_ALIAS,
    _EXPLORE_NAV,
    {
        "type": "function",
        "function": {
            "name": "open_courses",
            "description": "Mở danh sách khóa học.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "open_dashboard",
            "description": "Mở dashboard.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "open_my_courses",
            "description": "Mở khóa học của tôi.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]

_ALL_BY_NAME: dict[str, dict[str, Any]] = {}
for group in (COURSE_TOOLS, LEARNING_PATH_TOOLS, EXPLORE_TOOLS, GENERAL_TOOLS):
    for t in group:
        n = t["function"]["name"]
        _ALL_BY_NAME[n] = t


def tools_for_context(
    context: str,
    allowed_tools: list[str] | None = None,
) -> list[dict[str, Any]]:
    if context == "course":
        base = list(COURSE_TOOLS)
    elif context == "learning_path":
        base = list(LEARNING_PATH_TOOLS)
    elif context == "explore":
        base = list(EXPLORE_TOOLS)
    else:
        base = list(GENERAL_TOOLS)
    if not allowed_tools:
        return base
    allow = set(allowed_tools)
    allow.update({"go_to_explore", "navigate_to_narrative"})
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for t in base:
        n = t["function"]["name"]
        if n in allow and n not in seen:
            out.append(t)
            seen.add(n)
    for name in allow:
        if name in _ALL_BY_NAME and name not in seen:
            out.append(_ALL_BY_NAME[name])
            seen.add(name)
    return out


def _allowed_lesson_slugs(course: dict | None) -> set[str]:
    if not course:
        return set()
    return {str(l.get("slug") or "") for l in (course.get("lessons") or []) if l.get("slug")}


def _clamp_stage_ma(v: float) -> float:
    return max(STAGE_TIME_MIN_MA, min(STAGE_TIME_MAX_MA, float(v)))


def _normalize_explore_args(args: dict[str, Any], name: str) -> dict[str, Any] | None:
    st = args.get("stage_time_ma") if "stage_time_ma" in args else args.get("stageTime")
    try:
        st_f = _clamp_stage_ma(float(st))
    except (TypeError, ValueError):
        return None
    planet = str(args.get("planet") or "earth").strip().lower() or "earth"
    pin = args.get("pin_id") or args.get("pinId")
    entity = args.get("entity_id") or args.get("entityId")
    out: dict[str, Any] = {"stage_time_ma": st_f, "planet": planet}
    if isinstance(pin, str) and pin.strip():
        out["pin_id"] = pin.strip()
    if isinstance(entity, str) and entity.strip():
        out["entity_id"] = entity.strip()
    canonical = "navigate_to_narrative" if name in ("navigate_to_narrative", "go_to_explore") else name
    return {"name": canonical, "arguments": out}


def validate_and_normalize_tool_calls(
    context: str,
    course: dict | None,
    raw_tool_calls: list[dict[str, Any]] | None,
    learning_path: dict | None = None,
) -> list[dict[str, Any]]:
    if not raw_tool_calls:
        return []

    allowed_slugs = _allowed_lesson_slugs(course)
    lp_lesson_id = str((learning_path or {}).get("currentLessonId") or "").strip()
    out: list[dict[str, Any]] = []

    for tc in raw_tool_calls[:5]:
        if not isinstance(tc, dict):
            continue
        fn = tc.get("function")
        if not isinstance(fn, dict):
            continue
        name = fn.get("name")
        if not isinstance(name, str):
            continue
        raw_args = fn.get("arguments")
        if isinstance(raw_args, str):
            try:
                args = json.loads(raw_args) if raw_args.strip() else {}
            except json.JSONDecodeError:
                continue
        elif isinstance(raw_args, dict):
            args = raw_args
        else:
            args = {}

        tid = tc.get("id")

        if name == "open_lesson":
            if context != "course":
                continue
            slug = args.get("lesson_slug") or args.get("lessonSlug")
            if not isinstance(slug, str) or not slug.strip():
                continue
            slug = slug.strip()
            if allowed_slugs and slug not in allowed_slugs:
                continue
            out.append({"id": tid, "name": name, "arguments": {"lesson_slug": slug}})

        elif name in ("go_to_explore", "navigate_to_narrative"):
            if context not in ("course", "general", "learning_path", "explore"):
                continue
            norm = _normalize_explore_args(args, name)
            if not norm:
                continue
            out.append({"id": tid, "name": norm["name"], "arguments": norm["arguments"]})

        elif name == "open_learning_path_lesson":
            if context not in ("learning_path", "explore", "general"):
                continue
            lid = args.get("lesson_id") or args.get("lessonId")
            if not isinstance(lid, str) or not lid.strip():
                continue
            lid = lid.strip()
            if lp_lesson_id and lid != lp_lesson_id and context == "learning_path":
                pass
            out.append({"id": tid, "name": name, "arguments": {"lesson_id": lid}})

        elif name == "suggest_depth_switch":
            if context not in ("learning_path",):
                continue
            depth = str(args.get("suggested_depth") or args.get("suggestedDepth") or "").lower()
            reason = str(args.get("reason") or "").strip()
            if depth not in DEPTH_VALUES or len(reason) < 4:
                continue
            out.append(
                {
                    "id": tid,
                    "name": name,
                    "arguments": {"suggested_depth": depth, "reason": reason},
                }
            )

        elif name == "open_courses" and context in ("general", "learning_path", "explore"):
            out.append({"id": tid, "name": name, "arguments": {}})
        elif name == "open_dashboard" and context in ("general", "learning_path", "explore"):
            out.append({"id": tid, "name": name, "arguments": {}})
        elif name == "open_my_courses" and context in ("general", "learning_path", "explore"):
            out.append({"id": tid, "name": name, "arguments": {}})

        elif name == "highlight_concept_in_map":
            if context not in ("learning_path", "explore", "general"):
                continue
            cid = args.get("concept_id") or args.get("conceptId")
            if not isinstance(cid, str) or not cid.strip():
                continue
            out.append({"id": tid, "name": name, "arguments": {"concept_id": cid.strip()}})

        elif name == "show_related_lessons":
            if context not in ("learning_path", "explore", "general"):
                continue
            norm: dict[str, Any] = {}
            cid = args.get("concept_id") or args.get("conceptId")
            lid = args.get("lesson_id") or args.get("lessonId")
            if isinstance(cid, str) and cid.strip():
                norm["concept_id"] = cid.strip()
            if isinstance(lid, str) and lid.strip():
                norm["lesson_id"] = lid.strip()
            if not norm:
                continue
            out.append({"id": tid, "name": name, "arguments": norm})

        elif name == "start_recall_quiz":
            if context not in ("learning_path",):
                continue
            lid = args.get("lesson_id") or args.get("lessonId")
            if not isinstance(lid, str) or not lid.strip():
                continue
            out.append({"id": tid, "name": name, "arguments": {"lesson_id": lid.strip()}})

    return out


def extract_tool_calls_from_response(data: dict[str, Any]) -> list[dict[str, Any]] | None:
    choices = data.get("choices")
    if not choices or not isinstance(choices, list):
        return None
    msg = (choices[0] or {}).get("message")
    if not isinstance(msg, dict):
        return None
    tc = msg.get("tool_calls")
    if not isinstance(tc, list):
        return None
    return tc
