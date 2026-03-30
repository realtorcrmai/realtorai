#!/usr/bin/env python3
"""
Multi-Provider LLM Abstraction
Supports Ollama, OpenAI, Anthropic, and Groq with automatic fallback.
"""
from __future__ import annotations

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
    ANTHROPIC_API_KEY, ANTHROPIC_MODEL, ANTHROPIC_MODEL_FAST,
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
        usage = {}
        if "eval_count" in data:
            usage["input_tokens"] = data.get("prompt_eval_count", 0)
            usage["output_tokens"] = data.get("eval_count", 0)
        return {
            "content": msg.get("content", ""),
            "tool_calls": msg.get("tool_calls"),
            "usage": usage,
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
    _client = None  # Class-level cached client

    def __init__(self, api_key: str = OPENAI_API_KEY, model: str = OPENAI_MODEL):
        self.api_key = api_key
        self.model = model

    def _get_client(self):
        if OpenAIProvider._client is None:
            from openai import AsyncOpenAI
            OpenAIProvider._client = AsyncOpenAI(api_key=self.api_key)
        return OpenAIProvider._client

    def is_available(self) -> bool:
        return bool(self.api_key)

    async def chat(self, messages: list, tools: list | None = None) -> dict:
        client = self._get_client()

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

        usage = {}
        if response.usage:
            usage["input_tokens"] = response.usage.prompt_tokens
            usage["output_tokens"] = response.usage.completion_tokens

        return {
            "content": choice.message.content or "",
            "tool_calls": tool_calls,
            "usage": usage,
        }

    async def chat_stream(self, messages: list, tools: list | None = None) -> AsyncGenerator[dict, None]:
        client = self._get_client()

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
    _client = None  # Class-level cached client

    def __init__(self, api_key: str = ANTHROPIC_API_KEY, model: str = ANTHROPIC_MODEL):
        self.api_key = api_key
        self.model = model

    def _get_client(self):
        if AnthropicProvider._client is None:
            import anthropic
            AnthropicProvider._client = anthropic.AsyncAnthropic(api_key=self.api_key)
        return AnthropicProvider._client

    def is_available(self) -> bool:
        return bool(self.api_key)

    def _convert_messages(self, messages: list) -> tuple[list, list]:
        """Convert OpenAI-format messages to Anthropic format.
        Returns (system_blocks, converted_messages).

        Handles proper Anthropic tool_use / tool_result message format:
        - "assistant_tool_use" role → assistant message with tool_use content blocks
        - "tool_result" role → user message with tool_result content blocks
        - "tool" role (legacy) → user message with text tool result

        Ensures valid role alternation (user/assistant must alternate).
        """
        system_parts = []
        converted = []

        for msg in messages:
            role = msg["role"]

            if role == "system":
                system_parts.append(msg["content"])

            elif role == "assistant_tool_use":
                # Assistant message containing tool_use blocks (stored by our handler)
                converted.append({
                    "role": "assistant",
                    "content": msg["content"],  # list of tool_use content blocks
                })

            elif role == "tool_result":
                # User message containing tool_result blocks
                converted.append({
                    "role": "user",
                    "content": msg["content"],  # list of tool_result content blocks
                })

            elif role == "assistant":
                converted.append({"role": "assistant", "content": msg["content"]})

            elif role == "user":
                converted.append({"role": "user", "content": msg["content"]})

            elif role == "tool":
                # Legacy format — wrap as user message
                converted.append({"role": "user", "content": f"[Tool result]: {msg['content']}"})

        # Fix role alternation: merge consecutive same-role messages
        merged = []
        for msg in converted:
            if merged and merged[-1]["role"] == msg["role"]:
                # Merge: append content
                prev = merged[-1]["content"]
                curr = msg["content"]
                if isinstance(prev, str) and isinstance(curr, str):
                    merged[-1]["content"] = prev + "\n" + curr
                elif isinstance(prev, list) and isinstance(curr, list):
                    merged[-1]["content"] = prev + curr
                elif isinstance(prev, str) and isinstance(curr, list):
                    merged[-1]["content"] = [{"type": "text", "text": prev}] + curr
                elif isinstance(prev, list) and isinstance(curr, str):
                    merged[-1]["content"] = prev + [{"type": "text", "text": curr}]
            else:
                merged.append(msg)

        # Ensure conversation starts with user (Anthropic requirement)
        if merged and merged[0]["role"] == "assistant":
            merged.insert(0, {"role": "user", "content": "(conversation start)"})

        # Build system blocks with cache_control on the main prompt (first block)
        system_blocks = []
        for i, part in enumerate(system_parts):
            block = {"type": "text", "text": part}
            if i == 0:
                block["cache_control"] = {"type": "ephemeral"}
            system_blocks.append(block)

        return system_blocks, merged

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
        client = self._get_client()

        system_blocks, converted_msgs = self._convert_messages(messages)

        kwargs = {
            "model": self.model,
            "max_tokens": 4096,
            "messages": converted_msgs,
        }
        if system_blocks:
            kwargs["system"] = system_blocks
        if tools:
            kwargs["tools"] = self._convert_tools(tools)

        response = await client.messages.create(**kwargs)

        content = ""
        tool_calls = None
        raw_content_blocks = []  # preserve original Anthropic content blocks
        for block in response.content:
            if block.type == "text":
                content += block.text
                raw_content_blocks.append({"type": "text", "text": block.text})
            elif block.type == "tool_use":
                if tool_calls is None:
                    tool_calls = []
                tool_calls.append({
                    "id": block.id,
                    "function": {
                        "name": block.name,
                        "arguments": json.dumps(block.input),
                    }
                })
                raw_content_blocks.append({
                    "type": "tool_use",
                    "id": block.id,
                    "name": block.name,
                    "input": block.input,
                })

        usage = {}
        if hasattr(response, "usage") and response.usage:
            usage["input_tokens"] = response.usage.input_tokens
            usage["output_tokens"] = response.usage.output_tokens
            if hasattr(response.usage, "cache_creation_input_tokens"):
                usage["cache_creation_input_tokens"] = response.usage.cache_creation_input_tokens or 0
            if hasattr(response.usage, "cache_read_input_tokens"):
                usage["cache_read_input_tokens"] = response.usage.cache_read_input_tokens or 0

        return {
            "content": content,
            "tool_calls": tool_calls,
            "raw_content_blocks": raw_content_blocks,
            "usage": usage,
        }

    async def chat_stream(self, messages: list, tools: list | None = None) -> AsyncGenerator[dict, None]:
        client = self._get_client()

        system_blocks, converted_msgs = self._convert_messages(messages)

        kwargs = {
            "model": self.model,
            "max_tokens": 4096,
            "messages": converted_msgs,
        }
        if system_blocks:
            kwargs["system"] = system_blocks
        if tools:
            kwargs["tools"] = self._convert_tools(tools)

        # Accumulators for multi-tool responses
        tool_calls_acc = []       # list of completed tool call dicts
        current_tool_id = ""
        current_tool_name = ""
        current_tool_input = ""
        in_tool_use = False
        emitted_done = False
        raw_content_blocks = []   # Anthropic content blocks for session history
        usage = {}

        try:
            async with client.messages.stream(**kwargs) as stream:
                async for event in stream:
                    if event.type == "message_start":
                        # Capture input token usage
                        if hasattr(event, "message") and hasattr(event.message, "usage"):
                            usage["input_tokens"] = event.message.usage.input_tokens

                    elif event.type == "content_block_start":
                        block = event.content_block
                        if hasattr(block, "type") and block.type == "tool_use":
                            in_tool_use = True
                            current_tool_id = block.id
                            current_tool_name = block.name
                            current_tool_input = ""
                        elif hasattr(block, "type") and block.type == "text":
                            in_tool_use = False

                    elif event.type == "content_block_delta":
                        if in_tool_use and hasattr(event.delta, "partial_json"):
                            current_tool_input += event.delta.partial_json
                        elif hasattr(event.delta, "text"):
                            yield {"token": event.delta.text, "done": False}

                    elif event.type == "content_block_stop":
                        if in_tool_use:
                            try:
                                parsed_input = json.loads(current_tool_input) if current_tool_input else {}
                            except json.JSONDecodeError:
                                parsed_input = {}
                            tool_calls_acc.append({
                                "id": current_tool_id,
                                "function": {
                                    "name": current_tool_name,
                                    "arguments": json.dumps(parsed_input),
                                },
                            })
                            raw_content_blocks.append({
                                "type": "tool_use",
                                "id": current_tool_id,
                                "name": current_tool_name,
                                "input": parsed_input,
                            })
                            in_tool_use = False
                            # Don't return — wait for message_stop to collect all tool calls

                    elif event.type == "message_delta":
                        # Capture output token usage
                        if hasattr(event, "usage") and event.usage:
                            usage["output_tokens"] = event.usage.output_tokens

                    elif event.type == "message_stop":
                        emitted_done = True
                        if tool_calls_acc:
                            yield {
                                "tool_calls": tool_calls_acc,
                                "raw_content_blocks": raw_content_blocks,
                                "usage": usage,
                                "done": True,
                            }
                        else:
                            yield {"token": "", "usage": usage, "done": True}
                        return

        except Exception as e:
            if not emitted_done:
                yield {"token": "", "done": True}
            return

        if not emitted_done:
            if tool_calls_acc:
                yield {
                    "tool_calls": tool_calls_acc,
                    "raw_content_blocks": raw_content_blocks,
                    "usage": usage,
                    "done": True,
                }
            else:
                yield {"token": "", "done": True}


class GroqProvider(LLMProvider):
    """Groq API provider (fast inference)."""

    name = "groq"
    _client = None  # Class-level cached client

    def __init__(self, api_key: str = GROQ_API_KEY, model: str = GROQ_MODEL):
        self.api_key = api_key
        self.model = model

    def _get_client(self):
        if GroqProvider._client is None:
            from groq import AsyncGroq
            GroqProvider._client = AsyncGroq(api_key=self.api_key)
        return GroqProvider._client

    def is_available(self) -> bool:
        return bool(self.api_key)

    async def chat(self, messages: list, tools: list | None = None) -> dict:
        client = self._get_client()

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

        usage = {}
        if response.usage:
            usage["input_tokens"] = response.usage.prompt_tokens
            usage["output_tokens"] = response.usage.completion_tokens

        return {
            "content": choice.message.content or "",
            "tool_calls": tool_calls,
            "usage": usage,
        }

    async def chat_stream(self, messages: list, tools: list | None = None) -> AsyncGenerator[dict, None]:
        client = self._get_client()

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
#  SMART MODEL ROUTING
# ═══════════════════════════════════════════════════════════════════════════════

# Patterns that require Sonnet (complex reasoning, generation, mutations)
_SONNET_PATTERNS = [
    # Content generation
    "draft", "write", "compose", "create an email", "generate",
    # Analysis
    "analyze", "compare", "explain why", "what should i",
    "strategy", "recommend", "plan", "summarize",
    "negotiate", "what's the best", "help me think",
    "review", "evaluate", "pros and cons",
    # Mutations — actions that change data must use Sonnet for reliable tool calling
    "create a task", "create task", "add a task", "add task",
    "set a reminder", "set reminder", "remind me",
    "update", "change", "modify", "delete", "remove",
    "schedule", "book", "cancel",
    "add a note", "take a note", "save a note",
    "create a deal", "create deal", "add a deal",
    "create a listing", "create listing", "add listing",
    "create a showing", "create showing", "book showing",
    "create a contact", "add contact", "create contact",
]


def classify_complexity(message: str) -> str:
    """Classify a message as 'simple' or 'complex' for model routing.
    Simple → Haiku (cheap, fast). Complex → Sonnet (smart, expensive).
    """
    msg_lower = message.lower().strip()

    # Short messages are almost always simple lookups
    if len(msg_lower.split()) <= 4:
        return "simple"

    # Check for complex patterns
    for pattern in _SONNET_PATTERNS:
        if pattern in msg_lower:
            return "complex"

    # Default: simple (most voice queries are lookups/navigation)
    return "simple"


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


async def chat_with_fallback(provider: LLMProvider, messages, tools=None) -> dict:
    """Call provider.chat() with runtime fallback to next provider on error."""
    try:
        return await provider.chat(messages, tools)
    except Exception as primary_err:
        print(f"[LLM] Primary provider {provider.name} failed: {primary_err}")
        # Try each fallback provider
        for fallback_name in LLM_FALLBACK_CHAIN:
            fallback_name = fallback_name.strip()
            if fallback_name == provider.name:
                continue  # Skip the one that just failed
            if fallback_name in _PROVIDERS:
                fallback = _PROVIDERS[fallback_name]()
                if fallback.is_available():
                    try:
                        print(f"[LLM] Trying runtime fallback: {fallback_name}")
                        return await fallback.chat(messages, tools)
                    except Exception as fb_err:
                        print(f"[LLM] Fallback {fallback_name} also failed: {fb_err}")
                        continue
        # All fallbacks exhausted — re-raise original error
        raise primary_err


def get_provider_for_query(message: str) -> LLMProvider:
    """Smart routing: use Haiku for simple queries, Sonnet for complex ones.
    Only applies when the active provider is Anthropic.
    """
    active = get_active_provider()
    if active.name != "anthropic":
        return active

    complexity = classify_complexity(message)
    if complexity == "simple":
        return AnthropicProvider(api_key=ANTHROPIC_API_KEY, model=ANTHROPIC_MODEL_FAST)
    return active
