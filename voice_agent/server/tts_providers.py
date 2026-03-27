#!/usr/bin/env python3
"""
Multi-Provider TTS Abstraction
Supports Piper (local), OpenAI TTS, and ElevenLabs.
"""

import os
import sys
from abc import ABC, abstractmethod
from typing import Optional

sys.path.insert(0, os.path.dirname(__file__))
from config import (
    TTS_PROVIDER,
    PIPER_VOICE,
    OPENAI_API_KEY, OPENAI_TTS_VOICE, OPENAI_TTS_MODEL,
    ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID,
)


class TTSProvider(ABC):
    """Abstract TTS provider interface."""

    name: str = "base"

    @abstractmethod
    async def synthesize(self, text: str) -> bytes:
        """Convert text to audio bytes (WAV/MP3)."""
        ...

    def is_available(self) -> bool:
        return True

    def get_info(self) -> dict:
        return {"provider": self.name, "available": self.is_available()}


class PiperTTSProvider(TTSProvider):
    """Local Piper TTS provider."""

    name = "piper"

    def __init__(self, voice: str = PIPER_VOICE):
        self.voice = voice

    def is_available(self) -> bool:
        try:
            import piper  # noqa: F401
            return True
        except ImportError:
            return False

    async def synthesize(self, text: str) -> bytes:
        import io
        import wave
        from piper import PiperVoice

        voice = PiperVoice.load(self.voice)
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav:
            voice.synthesize(text, wav)
        return buffer.getvalue()


class OpenAITTSProvider(TTSProvider):
    """OpenAI TTS API provider."""

    name = "openai_tts"

    def __init__(
        self,
        api_key: str = OPENAI_API_KEY,
        voice: str = OPENAI_TTS_VOICE,
        model: str = OPENAI_TTS_MODEL,
    ):
        self.api_key = api_key
        self.voice = voice
        self.model = model

    def is_available(self) -> bool:
        return bool(self.api_key)

    async def synthesize(self, text: str) -> bytes:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.api_key)
        response = await client.audio.speech.create(
            model=self.model,
            voice=self.voice,
            input=text,
            response_format="mp3",
        )
        return response.content


class ElevenLabsTTSProvider(TTSProvider):
    """ElevenLabs TTS API provider."""

    name = "elevenlabs"

    def __init__(
        self,
        api_key: str = ELEVENLABS_API_KEY,
        voice_id: str = ELEVENLABS_VOICE_ID,
    ):
        self.api_key = api_key
        self.voice_id = voice_id

    def is_available(self) -> bool:
        return bool(self.api_key)

    async def synthesize(self, text: str) -> bytes:
        import httpx

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}",
                headers={
                    "xi-api-key": self.api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                    },
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.content


class EdgeTTSProvider(TTSProvider):
    """Microsoft Edge TTS — free, high-quality, no API key needed."""

    name = "edge_tts"

    def __init__(self, voice: str = "en-US-JennyNeural"):
        self.voice = voice

    def is_available(self) -> bool:
        try:
            import edge_tts  # noqa: F401
            return True
        except ImportError:
            return False

    async def synthesize(self, text: str) -> bytes:
        import edge_tts
        import io

        communicate = edge_tts.Communicate(text, self.voice)
        buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buffer.write(chunk["data"])
        return buffer.getvalue()


# ═══════════════════════════════════════════════════════════════════════════════
#  FACTORY
# ═══════════════════════════════════════════════════════════════════════════════

_TTS_PROVIDERS = {
    "piper": PiperTTSProvider,
    "openai_tts": OpenAITTSProvider,
    "elevenlabs": ElevenLabsTTSProvider,
    "edge_tts": EdgeTTSProvider,
}


def get_tts_provider(name: Optional[str] = None) -> TTSProvider:
    """Get a TTS provider by name."""
    name = name or TTS_PROVIDER
    if name in _TTS_PROVIDERS:
        provider = _TTS_PROVIDERS[name]()
        if provider.is_available():
            return provider
    # Fallback to Piper
    return PiperTTSProvider()
