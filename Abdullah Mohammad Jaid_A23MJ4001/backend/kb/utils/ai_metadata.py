from __future__ import annotations

import json
import logging
import re
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
MODEL = "deepseek-chat"

PROMPT = (
    "You are a knowledge base assistant. Given the following raw content from a logistics operations "
    "document, generate a succinct title (max 10 words), a 1–2 sentence summary, and 3–5 relevant "
    "lowercase tags. Return ONLY a valid JSON object with keys: `title`, `summary`, `tags` (array of strings). "
    "Do not include any extra commentary.\n\n"
    "Content:\n"
)


def _extract_json_object(text: str) -> str:
    s = (text or "").strip()
    if not s:
        raise ValueError("Empty AI response")

    # Strip common code fences
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```$", "", s)
        s = s.strip()

    # First try direct JSON
    try:
        json.loads(s)
        return s
    except Exception:
        pass

    # Fallback: attempt to grab the first {...} block
    start = s.find("{")
    end = s.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = s[start : end + 1].strip()
        json.loads(candidate)
        return candidate

    raise ValueError("AI response did not contain valid JSON")


def _normalize_tags(tags: Any) -> list[str]:
    if not isinstance(tags, list):
        raise ValueError("tags must be an array")

    normalized: list[str] = []
    seen: set[str] = set()
    for t in tags:
        if not isinstance(t, str):
            continue
        v = t.strip().lower()
        if not v:
            continue
        if v in seen:
            continue
        seen.add(v)
        normalized.append(v)

    if len(normalized) < 3:
        raise ValueError("Expected 3–5 tags")
    return normalized[:5]


def generate_metadata(text: str) -> dict[str, Any]:
    api_key = getattr(settings, "DEEPSEEK_API_KEY", None)
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY is not configured")

    base_url = getattr(settings, "DEEPSEEK_API_BASE_URL", None) or DEFAULT_DEEPSEEK_BASE_URL
    truncated = (text or "")[:3000]

    payload = {
        "model": MODEL,
        "temperature": 0.3,
        "max_tokens": 200,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": f"{PROMPT}{truncated}"},
        ],
    }

    try:
        resp = requests.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        content = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )

        json_text = _extract_json_object(content)
        obj = json.loads(json_text)
        if not isinstance(obj, dict):
            raise ValueError("AI response JSON must be an object")

        title = obj.get("title")
        summary = obj.get("summary")
        tags = _normalize_tags(obj.get("tags"))

        if not isinstance(title, str) or not title.strip():
            raise ValueError("title must be a non-empty string")
        if not isinstance(summary, str) or not summary.strip():
            raise ValueError("summary must be a non-empty string")

        return {"title": title.strip(), "summary": summary.strip(), "tags": tags}
    except Exception as exc:
        # Don't log document content or secrets.
        logger.error("DeepSeek metadata generation failed", exc_info=True)
        raise
