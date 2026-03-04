"""
Centralized LLM client for the Green-Tape backend.

This keeps all provider-specific logic in one place so the rest of the codebase
can call a simple, testable interface.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Dict, Optional

import requests


class LLMConfigurationError(RuntimeError):
    pass


@dataclass
class LLMResponse:
    text: str


def _get_openai_base_and_key() -> tuple[str, str]:
    """
    Resolve the OpenAI-compatible base URL and API key from environment.

    Supports both official OpenAI and OpenAI-compatible gateways (e.g. Azure or
    self-hosted) by relying on a generic HTTP interface.
    """

    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("LLM_API_KEY")
    base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
    if not api_key:
        raise LLMConfigurationError(
            "No OPENAI_API_KEY or LLM_API_KEY configured for LLM access."
        )
    return base_url.rstrip("/"), api_key


def call_llm(
    prompt: str,
    *,
    system_prompt: Optional[str] = None,
    model: Optional[str] = None,
    temperature: float = 0.2,
    max_tokens: int = 2048,
) -> LLMResponse:
    """
    Call an OpenAI-compatible chat completion endpoint.

    This intentionally avoids depending on heavy SDKs and just uses requests so
    it works with any provider that implements the OpenAI /v1/chat/completions
    interface.
    """

    base_url, api_key = _get_openai_base_and_key()
    model_name = model or os.environ.get("OPENAI_MODEL", "gpt-4.1-mini")

    url = f"{base_url}/chat/completions"

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    payload: Dict[str, Any] = {
        "model": model_name,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=60)
    resp.raise_for_status()
    data = resp.json()

    try:
        text = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:  # pragma: no cover - defensive
        raise RuntimeError(f"Unexpected LLM response shape: {data}") from exc

    return LLMResponse(text=text)


def call_llm_json(
    prompt: str,
    *,
    system_prompt: Optional[str] = None,
    model: Optional[str] = None,
    temperature: float = 0.1,
    max_tokens: int = 1024,
) -> Dict[str, Any]:
    """
    Convenience wrapper that expects the model to return valid JSON.

    The caller is responsible for constraining the prompt so that the response
    is a single JSON object. If parsing fails, a RuntimeError is raised.
    """

    response = call_llm(
        prompt,
        system_prompt=system_prompt,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    text = response.text.strip()
    # Try to locate the first JSON object in the response.
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise RuntimeError(f"LLM did not return JSON: {text[:2000]}")

    snippet = text[start : end + 1]
    return json.loads(snippet)

