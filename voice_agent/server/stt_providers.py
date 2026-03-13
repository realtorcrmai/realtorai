#!/usr/bin/env python3
"""
Multi-Provider STT Abstraction
Supports local Whisper (faster-whisper) and OpenAI Whisper API.
"""

import os
import sys
from abc import ABC, abstractmethod
from typing import Optional

sys.path.insert(0, os.path.dirname(__file__))
from config import STT_PROVIDER, WHISPER_MODEL, OPENAI_API_KEY


class STTProvider(ABC):
    """Abstract STT provider interface."""

    name: str = "base"

    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, language: str = "en") -> str:
        """Transcribe audio bytes to text."""
        ...

    def is_available(self) -> bool:
        return True

    def get_info(self) -> dict:
        return {"provider": self.name, "available": self.is_available()}


class WhisperLocalProvider(STTProvider):
    """Local Whisper STT via faster-whisper."""

    name = "whisper_local"

    def __init__(self, model: str = WHISPER_MODEL):
        self.model_name = model
        self._model = None

    def is_available(self) -> bool:
        try:
            from faster_whisper import WhisperModel  # noqa: F401
            return True
        except ImportError:
            return False

    def _get_model(self):
        if self._model is None:
            from faster_whisper import WhisperModel
            self._model = WhisperModel(self.model_name, device="auto", compute_type="auto")
        return self._model

    async def transcribe(self, audio_bytes: bytes, language: str = "en") -> str:
        import asyncio
        import io

        model = self._get_model()

        def _transcribe():
            segments, _ = model.transcribe(io.BytesIO(audio_bytes), language=language)
            return " ".join(seg.text for seg in segments).strip()

        return await asyncio.get_event_loop().run_in_executor(None, _transcribe)


class OpenAIWhisperProvider(STTProvider):
    """OpenAI Whisper API STT provider."""

    name = "openai_whisper"

    def __init__(self, api_key: str = OPENAI_API_KEY):
        self.api_key = api_key

    def is_available(self) -> bool:
        return bool(self.api_key)

    async def transcribe(self, audio_bytes: bytes, language: str = "en") -> str:
        from openai import AsyncOpenAI
        import io

        client = AsyncOpenAI(api_key=self.api_key)
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "audio.wav"

        transcript = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language=language,
        )
        return transcript.text


# ═══════════════════════════════════════════════════════════════════════════════
#  FACTORY
# ═══════════════════════════════════════════════════════════════════════════════

_STT_PROVIDERS = {
    "whisper_local": WhisperLocalProvider,
    "openai_whisper": OpenAIWhisperProvider,
}


def get_stt_provider(name: Optional[str] = None) -> STTProvider:
    """Get an STT provider by name."""
    name = name or STT_PROVIDER
    if name in _STT_PROVIDERS:
        provider = _STT_PROVIDERS[name]()
        if provider.is_available():
            return provider
    return WhisperLocalProvider()
