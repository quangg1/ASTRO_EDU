"""
Cấu hình chuỗi LLM (OpenAI-compatible): OpenRouter → LM Studio → Groq.
Thử lần lượt khi hết credit, rate limit, hoặc lỗi kết nối.

Mỗi provider có thể khai báo nhiều key/model trong env (CSV), ví dụ:
  OPENROUTER_API_KEYS=sk-or-1,sk-or-2
  OPENROUTER_MODELS=openrouter/free,anthropic/claude-3-haiku
  GROQ_API_KEYS=gsk_a,gsk_b
  GROQ_MODELS=llama-3.3-70b-versatile,llama-3.1-8b-instant

Key/model ghép theo index; thiếu model → lặp model cuối hoặc OPENROUTER_MODEL / GROQ_MODEL mặc định.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class LlmProvider:
    label: str
    base_url: str
    model: str
    api_key: str
    merge_system_into_user: bool = False
    extra_headers: dict[str, str] = field(default_factory=dict)

    @property
    def chat_completions_url(self) -> str:
        return f"{self.base_url.rstrip('/')}/chat/completions"

    def request_headers(self) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        headers.update(self.extra_headers)
        return headers


def _parse_csv(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [part.strip() for part in raw.split(",") if part.strip()]


def _collect_api_keys(single_var: str, plural_var: str) -> list[str]:
    """Gom key đơn + danh sách CSV; giữ thứ tự, bỏ trùng."""
    keys: list[str] = []
    seen: set[str] = set()
    single = os.environ.get(single_var, "").strip()
    if single and single not in seen:
        keys.append(single)
        seen.add(single)
    for key in _parse_csv(os.environ.get(plural_var, "")):
        if key not in seen:
            keys.append(key)
            seen.add(key)
    return keys


def _has_any_api_key(single_var: str, plural_var: str) -> bool:
    return bool(_collect_api_keys(single_var, plural_var))


def _align_models(keys: list[str], models_var: str, default_model: str) -> list[str]:
    models = _parse_csv(os.environ.get(models_var, ""))
    if not models:
        return [default_model] * len(keys)
    aligned: list[str] = []
    for i in range(len(keys)):
        aligned.append(models[i] if i < len(models) else models[-1])
    return aligned


def _provider_dedupe_key(provider: LlmProvider) -> str:
    return f"{provider.label}:{provider.model}:{provider.api_key}"


def _slot_label(base: str, index: int, total: int) -> str:
    if total <= 1:
        return base
    return f"{base} #{index + 1}"


def _strip_base(url: str, default: str) -> str:
    raw = (url or default).strip().rstrip("/")
    if raw.endswith("/chat/completions"):
        raw = raw[: -len("/chat/completions")]
    return raw.rstrip("/")


def _openrouter_openrouter_site_url() -> str:
    return (
        os.environ.get("OPENROUTER_SITE_URL", "").strip()
        or os.environ.get("OPENROUTER_HTTP_REFERER", "").strip()
    )


def _openrouter_default_model(has_image: bool) -> str:
    if has_image:
        return (
            os.environ.get("OPENROUTER_VLM_MODEL", "").strip()
            or os.environ.get("OPENROUTER_MODEL", "").strip()
            or "openrouter/free"
        )
    return os.environ.get("OPENROUTER_MODEL", "").strip() or "openrouter/free"


def _openrouter_providers(has_image: bool) -> list[LlmProvider]:
    keys = _collect_api_keys("OPENROUTER_API_KEY", "OPENROUTER_API_KEYS")
    if not keys:
        return []
    base = _strip_base(
        os.environ.get("OPENROUTER_BASE_URL", ""),
        "https://openrouter.ai/api/v1",
    )
    default_model = _openrouter_default_model(has_image)
    models_var = "OPENROUTER_VLM_MODELS" if has_image else "OPENROUTER_MODELS"
    models = _align_models(keys, models_var, default_model)
    extra: dict[str, str] = {}
    site = _openrouter_openrouter_site_url()
    title = os.environ.get("OPENROUTER_APP_NAME", "").strip() or "Galaxies Edu"
    if site:
        extra["HTTP-Referer"] = site
    extra["X-Title"] = title
    return [
        LlmProvider(
            label=_slot_label("OpenRouter", i, len(keys)),
            base_url=base,
            model=model,
            api_key=api_key,
            merge_system_into_user=True,
            extra_headers=extra,
        )
        for i, (api_key, model) in enumerate(zip(keys, models))
    ]


def _lmstudio_default_model(has_image: bool) -> str:
    if has_image:
        return (
            os.environ.get("LM_STUDIO_VLM_MODEL", "").strip()
            or os.environ.get("LM_STUDIO_MODEL", "").strip()
            or os.environ.get("LLM_MODEL", "").strip()
        )
    return (
        os.environ.get("LM_STUDIO_MODEL", "").strip()
        or os.environ.get("LLM_MODEL", "").strip()
    )


def _lmstudio_providers(has_image: bool) -> list[LlmProvider]:
    default_model = _lmstudio_default_model(has_image)
    if not default_model:
        return []
    base = _strip_base(
        os.environ.get("LM_STUDIO_BASE_URL", "")
        or os.environ.get("LM_STUDIO_URL", ""),
        "http://127.0.0.1:1234/v1",
    )
    keys = _collect_api_keys("LM_STUDIO_API_KEY", "LM_STUDIO_API_KEYS")
    if not keys:
        keys = ["lm-studio"]
    models_var = "LM_STUDIO_VLM_MODELS" if has_image else "LM_STUDIO_MODELS"
    models = _align_models(keys, models_var, default_model)
    return [
        LlmProvider(
            label=_slot_label("LM Studio", i, len(keys)),
            base_url=base,
            model=model,
            api_key=api_key,
            merge_system_into_user=False,
        )
        for i, (api_key, model) in enumerate(zip(keys, models))
    ]


def _groq_default_model() -> str:
    return os.environ.get("GROQ_MODEL", "").strip() or "llama-3.3-70b-versatile"


def _groq_providers(has_image: bool) -> list[LlmProvider]:
    del has_image
    keys = _collect_api_keys("GROQ_API_KEY", "GROQ_API_KEYS")
    if not keys:
        return []
    base = _strip_base(
        os.environ.get("GROQ_BASE_URL", ""),
        "https://api.groq.com/openai/v1",
    )
    default_model = _groq_default_model()
    models = _align_models(keys, "GROQ_MODELS", default_model)
    return [
        LlmProvider(
            label=_slot_label("Groq Cloud", i, len(keys)),
            base_url=base,
            model=model,
            api_key=api_key,
            merge_system_into_user=False,
        )
        for i, (api_key, model) in enumerate(zip(keys, models))
    ]


_BUILDERS = {
    "openrouter": _openrouter_providers,
    "lmstudio": _lmstudio_providers,
    "lm_studio": _lmstudio_providers,
    "groq": _groq_providers,
}


def default_provider_order() -> str:
    explicit = os.environ.get("LLM_PROVIDER_ORDER", "").strip()
    if explicit:
        return explicit
    if _has_any_api_key("OPENROUTER_API_KEY", "OPENROUTER_API_KEYS"):
        return "openrouter,lmstudio,groq"
    if _has_any_api_key("GROQ_API_KEY", "GROQ_API_KEYS"):
        return "groq,lmstudio"
    return "lmstudio"


def build_provider_chain(has_image: bool = False) -> list[LlmProvider]:
    order = [p.strip().lower() for p in default_provider_order().split(",") if p.strip()]
    chain: list[LlmProvider] = []
    seen: set[str] = set()
    for name in order:
        builder = _BUILDERS.get(name)
        if not builder:
            continue
        for provider in builder(has_image):
            dedupe = _provider_dedupe_key(provider)
            if dedupe in seen:
                continue
            seen.add(dedupe)
            chain.append(provider)
    return chain


def should_fallback_to_next_provider(status_code: int, response_text: str) -> bool:
    """True = thử slot tiếp theo trong chuỗi (key/model/provider kế)."""
    if status_code in (401, 402, 403, 408, 429, 500, 502, 503, 504, 529):
        return True
    body = (response_text or "").lower()
    credit_markers = (
        "credit",
        "quota",
        "insufficient",
        "balance",
        "payment",
        "billing",
        "rate limit",
        "too many requests",
        "spend limit",
        "exceeded",
    )
    if status_code == 400 and any(m in body for m in credit_markers):
        return True
    if status_code >= 500:
        return True
    if status_code >= 400:
        return True
    return False


def provider_chain_status() -> dict[str, Any]:
    text_chain = build_provider_chain(False)
    vision_chain = build_provider_chain(True)

    def _serialize(providers: list[LlmProvider]) -> list[dict[str, str]]:
        out: list[dict[str, str]] = []
        for p in providers:
            key_hint = p.api_key[-4:] if len(p.api_key) >= 4 else "****"
            out.append(
                {
                    "label": p.label,
                    "model": p.model,
                    "base_url": p.base_url,
                    "key_hint": f"...{key_hint}",
                }
            )
        return out

    return {
        "order": default_provider_order(),
        "text": _serialize(text_chain),
        "vision": _serialize(vision_chain),
    }
