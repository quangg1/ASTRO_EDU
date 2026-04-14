"""
Định nghĩa tool (function calling) cho AI Agent — điều hướng app an toàn, có validate.
Client thực thi router; server chỉ trả về tool_calls đã lọc.
"""
from __future__ import annotations

import json
import os
from typing import Any

USE_AGENT_TOOLS = os.environ.get("USE_AGENT_TOOLS", "1") == "1"

# Thời gian địa chất hợp lệ (Ma) — tương thích /explore?stage=
STAGE_TIME_MIN_MA = -2000.0
STAGE_TIME_MAX_MA = 4600.0

COURSE_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "open_lesson",
            "description": "Mở một bài học trong khóa học hiện tại. Chỉ dùng slug có trong danh sách bài.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lesson_slug": {
                        "type": "string",
                        "description": "Slug bài học (vd. intro-earth-history)",
                    }
                },
                "required": ["lesson_slug"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "go_to_explore",
            "description": "Chuyển người dùng sang trang Khám phá (timeline Trái Đất) tại thời điểm triệu năm (Ma).",
            "parameters": {
                "type": "object",
                "properties": {
                    "stage_time_ma": {
                        "type": "number",
                        "description": "Thời gian tính bằng Ma (triệu năm), ví dụ 540 cho đầu kỷ Cambrian",
                    }
                },
                "required": ["stage_time_ma"],
            },
        },
    },
]

GENERAL_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "go_to_explore",
            "description": "Mở trang Khám phá tại thời điểm Ma trên timeline Trái Đất.",
            "parameters": {
                "type": "object",
                "properties": {
                    "stage_time_ma": {"type": "number", "description": "Thời gian Ma (triệu năm)"}
                },
                "required": ["stage_time_ma"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "open_courses",
            "description": "Mở trang danh sách khóa học.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "open_dashboard",
            "description": "Mở trang bảng điều khiển (dashboard) người học.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "open_my_courses",
            "description": "Mở trang khóa học của tôi.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]


def tools_for_context(context: str) -> list[dict[str, Any]]:
    return COURSE_TOOLS if context == "course" else GENERAL_TOOLS


def _allowed_lesson_slugs(course: dict | None) -> set[str]:
    if not course:
        return set()
    return {str(l.get("slug") or "") for l in (course.get("lessons") or []) if l.get("slug")}


def _clamp_stage_ma(v: float) -> float:
    return max(STAGE_TIME_MIN_MA, min(STAGE_TIME_MAX_MA, float(v)))


def validate_and_normalize_tool_calls(
    context: str,
    course: dict | None,
    raw_tool_calls: list[dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    """
    Trả về danh sách { id?, name, arguments: dict } an toàn cho client.
    """
    if not raw_tool_calls:
        return []

    allowed_slugs = _allowed_lesson_slugs(course)
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
            if slug not in allowed_slugs:
                continue
            out.append({"id": tid, "name": name, "arguments": {"lesson_slug": slug}})

        elif name == "go_to_explore":
            st = args.get("stage_time_ma") if "stage_time_ma" in args else args.get("stageTime")
            try:
                st_f = float(st)
            except (TypeError, ValueError):
                continue
            out.append(
                {
                    "id": tid,
                    "name": name,
                    "arguments": {"stage_time_ma": _clamp_stage_ma(st_f)},
                }
            )

        elif name == "open_courses" and context == "general":
            out.append({"id": tid, "name": name, "arguments": {}})
        elif name == "open_dashboard" and context == "general":
            out.append({"id": tid, "name": name, "arguments": {}})
        elif name == "open_my_courses" and context == "general":
            out.append({"id": tid, "name": name, "arguments": {}})

    return out


def extract_tool_calls_from_response(data: dict[str, Any]) -> list[dict[str, Any]] | None:
    """Đọc tool_calls từ JSON OpenAI-compatible."""
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
