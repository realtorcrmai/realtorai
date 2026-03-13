#!/usr/bin/env python3
"""
Multi-Provider LLM Abstraction
Supports Ollama, OpenAI, Anthropic, and Groq with automatic fallback.
"""

import json
import os
import sys
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional

sys.path.insert(0, os.path.dirname(__file__))
from config import (
    LLM_PROVIDER, LLM_FALLBACK_CHAIN,
    OLLAMA_MODEL, OLLAMA_URL,
    OPENAI_API_KEY, OPENAI_MODEL,
    ANTHROPIC_API_KEY, ANTHROPIC_MODEL,
    GROQ_API_KEY, GROQ_MODEL,
)


class LLMProvider(ABC):
    """Abstract LLM provider interface."""

    name: str = "base"

    @abstractmethod
    async def chat(self, messages: list, tools: list | None = None) -> dict:
        """
        Send a chat completion request.
        Returns: {"content": str, "tool_calls": list | None}
        """
        ...

    @abstractmethod
    async def chat_stream(self, messages: list, tools: list | None = None) -> AsyncGenerator[dict, None]:
        """
        Stream a chat completion.
        Yields: {"token": str, "done": bool} or {"tool_calls": list, "done": True}
        """
        ...

    def is_available(self) -> bool:
        """Check if this provider is configured and available."""
        return True


class OllamaProvider(LLMProvider):
    """Local Ollama LLM provider."""

    name = "ollama"

    def __init__(self, model: str = OLLAMA_MODEL, base_url: str = OLLAMA_URL):
        self.model = model
        self.base_url = base_url

    def is_available(self) -> bool:
        try:
            import httpx
            resp = httpx.get(f"{self.base_url}/api/tags", timeout=3)
            return resp.status_code == 200
        except Exception:
            return False

    async def chat(self, messages: list, tools: list | None = None) -> dict:
        import httpx
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
        }
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(f"{self.base_url}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()

        msg = data.get("message", {})
        return {
            "content": msg.get("content", ""),
            "tool_calls": msg.get("tool_calls"),
        }

    async def chat_stream(self, messages: list, tools: list | None = None) -> AsyncGenerator[dict, None]:
        import httpx
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True,
        }
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as resp:
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    try:
                        chunk = json.loads(line)
                        msg = chunk.get("message", {})
                        content = msg.get("content", "")
                        done = chunk.get("done", False)

                        if msg.get("tool_calls"):
                            yield {"tool_calls": msg["tool_calls"], "done": True}
                            return

                        if content:
                            yield {"token": content, "done": done}

                        if done:
                            return
                    except json.JSONDecodeError:
                        continue


class OpenAIProvider(LLMProvider):
    """OpenAI API provider."""

    name = "openai"

    def __init__(self, api_key: str = OPENAI_API_KEY, model: str = OPENAI_MODEL):
        self.api_key = api_key
        self.model = model

    def is_available(self) -> bool:
        return bool(self.api_key)

    async def chat(self, messages: list, tools: list | None = None) -> dict:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=self.api_key)

        kwargs = {"model": self.model, "messages": messages}
        if tools:
            kwargs["tools"] = tools

        response = await client.chat.completions.create(**kwargs)
        choice = response.choices[0]

        tool_calls = None
        if choice.message.tool_calls:
            tool_calls = [
                {
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    }
                }
                for tc in choice.message.tool_calls
            ]

        return {
            "content": choice.message.content or "",
            "tool_calls": tool_calls,
        }

    async def chat_stream(self, messages: list, tools: list | None = None) -> AsyncGenerator[dict, None]:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=self.api_key)

        kwargs = {"model": self.model, "messages": messages, "stream": True}
        if tools:
            kwargs["tools"] = tools

        tool_calls_acc = {}
        async for chunk in await client.chat.completions.create(**kwargs):
            delta = chunk.choices[0].delta if chunk.choices else None
            if not delta:
                continue

            # Accumulate tool calls
            if delta.tool_calls:
                for tc in delta.tool_calls:
                    idx = tc.index
                    if idx not in tool_calls_acc:
                        tool_calls_acc[idx] = {"function": {"name": "", "arguments": ""}}
                    if tc.function.name:
                        tool_calls_acc[idx]["function"]["name"] += tc.function.name
                    if tc.function.arguments:
                        tool_calls_acc[idx]["function"]["arguments"] += tc.function.arguments
                continue

            if delta.content:
                yield {"token": delta.content, "done": False}

            if chunk.choices[0].finish_reason:
                if tool_calls_acc:
                    yield {"tool_calls": list(tool_calls_acc.values()), "done": True}
                else:
                    yield {"token": "", "done": True}
                return


class AnthropicProvider(LLMProvider):
    """Anthropic Claude API provider."""

    name = "anthropic"

    def __init__(self, api_key: str = ANTHROPIC_API_KEY, model: str = ANTHROPIC_MODEL):
        self.api_key = api_key
        self.model = model

    def is_available(self) -> bool:
        return bool(self.api_key)

    def _convert_messages(self, messages: list) -> tuple[str, list]:
        """Convert OpenAI-format messages to Anthropic format."""
        system = ""
        converted = []
        for msg in messages:
            if msg["role"] == "system":
                system += msg["content"] + "\n"
            elif msg["role"] in ("user", "assistant"):
                converted.append({"role": msg["role"], "content": msg["content"]})
            elif msg["role"] == "tool":
                converted.append({"role": "user", "content": f"[Tool result]: {msg['content']}"})
        return system.strip(), converted

    def _convert_tools(self, tools: list) -> list:
        """Convert OpenAI-format tools to Anthropic format."""
        converted = []
        for tool in tools:
            fn = tool.get("function", {})
            converted.append({
                "name": fn["name"],
                "description": fn.get("description", ""),
                "input_schema": fn.get("parameters", {"type": "object", "properties": {}}),
            })
        return converted

    async def chat(self, messages: list, tools: list | None = None) -> dict:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=self.api_key)

        system, converted_msgs = self._convert_messages(messages)

        kwargs = {
            "model": self.model,
            "max_tokens": 4096,
            "messages": converted_msgs,
        }
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = self._convert_tools(tools)

        response = await client.messages.create(**kwargs)

        content = ""
        tool_calls = None
        for block in response.content:
            if block.type == "text":
                content += block.text
            elif block.type == "tool_use":
                if tool_calls is None:
                    tool_calls = []
                tool_calls.append({
                    "function": {
                        "name": block.name,
                        "arguments": json.dumps(block.input),
                    }
                })

        return {"content": content, "tool_calls": tool_calls}

    async def chat_stream(self, messages: list, tools: list | None = None) -> AsyncGenerator[dict, None]:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=self.api_key)

        system, converted_msgs = self._convert_messages(messages)

        kwargs = {
            "model": self.model,
            "max_tokens": 4096,
            "messages": converted_msgs,
            "stream": True,
        }
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = self._convert_tools(tools)

        tool_name = ""
        tool_input = ""
        in_tool_use = False

        async with client.messages.stream(**kwargs) as stream:
            async for event in stream:
                if event.type == "content_block_start":
                    if hasattr(event.content_block, "type") and event.content_block.type == "tool_use":
                        in_tool_use = True
                        tool_name = event.content_block.name
                        tool_input = ""
                elif event.type == "content_block_delta":
                    if in_tool_use and hasattr(event.delta, "partial_json"):
                        tool_input += event.delta.partial_json
                    elif hasattr(event.delta, "text"):
                        yield {"token": event.delta.text, "done": False}
                elif event.type == "content_block_stop":
                    if in_tool_use:
                        try:
                            parsed_input = json.loads(tool_input) if tool_input else {}
                        except json.JSONDecodeError:
                            parsed_input = {}
                        yield {
                            "tool_calls": [{"function": {"name": tool_name, "arguments": json.dumps(parsed_input)}}],
                            "done": True,
                        }
                        return
                elif event.type == "message_stop":
                    yield {"token": "", "done": True}
                    return


class GroqProvider(LLMProvider):
    """Groq API provider (fast inference)."""

    name = "groq"

    def __init__(self, api_key: str = GROQ_API_KEY, model: str = GROQ_MODEL):
        self.api_key = api_key
        self.model = model

    def is_available(self) -> bool:
        return bool(self.api_key)

    async def chat(self, messages: list, tools: list | None = None) -> dict:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=self.api_key)

        kwargs = {"model": self.model, "messages": messages}
        if tools:
            kwargs["tools"] = tools

        response = await client.chat.completions.create(**kwargs)
        choice = response.choices[0]

        tool_calls = None
        if choice.message.tool_calls:
            tool_calls = [
                {
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    }
                }
                for tc in choice.message.tool_calls
            ]

        return {
            "content": choice.message.content or "",
            "tool_calls": tool_calls,
        }

    async def chat_stream(self, messages: list, tools: list | None = None) -> AsyncGenerator[dict, None]:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=self.api_key)

        kwargs = {"model": self.model, "messages": messages, "stream": True}
        if tools:
            kwargs["tools"] = tools

        stream = await client.chat.completions.create(**kwargs)
        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if not delta:
                continue
            if delta.content:
                yield {"token": delta.content, "done": False}
            if chunk.choices[0].finish_reason:
                yield {"token": "", "done": True}
                return


# ═══════════════════════════════════════════════════════════════════════════════
#  FACTORY & FALLBACK
# ═══════════════════════════════════════════════════════════════════════════════

_PROVIDERS = {
    "ollama": OllamaProvider,
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "groq": GroqProvider,
}


def get_llm_provider(name: Optional[str] = None) -> LLMProvider:
    """Get an LLM provider by name. Falls back to the first available in the chain."""
    if name and name in _PROVIDERS:
        provider = _PROVIDERS[name]()
        if provider.is_available():
            return provider

    # Try fallback chain
    for fallback_name in LLM_FALLBACK_CHAIN:
        fallback_name = fallback_name.strip()
        if fallback_name in _PROVIDERS:
            provider = _PROVIDERS[fallback_name]()
            if provider.is_available():
                print(f"[LLM] Using fallback provider: {fallback_name}")
                return provider

    # Last resort: Ollama (even if unavailable, it'll give a clear error)
    print("[LLM] WARNING: No LLM providers available. Falling back to Ollama.")
    return OllamaProvider()


def get_active_provider() -> LLMProvider:
    """Get the currently configured primary LLM provider."""
    return get_llm_provider(LLM_PROVIDER)
