#!/usr/bin/env python3
"""
Voice Agent Configuration
All settings for the real estate voice agent.
Supports multi-provider LLM, TTS, and STT backends.
"""
import os
from dotenv import load_dotenv
load_dotenv()

# ── Mode Configuration ────────────────────────────────────────────────────────
MODE = os.getenv("AGENT_MODE", "realtor")  # "realtor", "client", or "generic"

# ── LLM Provider Configuration ────────────────────────────────────────────────
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama")  # ollama | openai | anthropic | groq
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:8b")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# ── LLM Fallback Chain ───────────────────────────────────────────────────────
LLM_FALLBACK_CHAIN = os.getenv("LLM_FALLBACK_CHAIN", "ollama,openai,groq").split(",")

# ── STT Provider Configuration ────────────────────────────────────────────────
STT_PROVIDER = os.getenv("STT_PROVIDER", "whisper_local")  # whisper_local | openai_whisper
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "large-v3")

# ── TTS Provider Configuration ────────────────────────────────────────────────
TTS_PROVIDER = os.getenv("TTS_PROVIDER", "piper")  # piper | openai_tts | elevenlabs
PIPER_VOICE = os.getenv("PIPER_VOICE", "en_US-amy-medium")
OPENAI_TTS_VOICE = os.getenv("OPENAI_TTS_VOICE", "nova")
OPENAI_TTS_MODEL = os.getenv("OPENAI_TTS_MODEL", "tts-1-hd")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")

# ── Daily.co WebRTC (voice pipeline) ─────────────────────────────────────────
DAILY_API_KEY = os.getenv("DAILY_API_KEY", "")
DAILY_ROOM_URL = os.getenv("DAILY_ROOM_URL", "")

# ── Google Calendar API ───────────────────────────────────────────────────────
GOOGLE_CALENDAR_CREDENTIALS = os.getenv("GOOGLE_CALENDAR_CREDS", "credentials.json")

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_PATH = os.path.join(os.path.dirname(__file__), "data", "voice_agent.db")

# ── Current realtor context (set by web UI) ───────────────────────────────────
CURRENT_REALTOR_ID = os.getenv("REALTOR_ID", "R001")

# ── ListingFlow integration ───────────────────────────────────────────────────
LISTINGFLOW_API = os.getenv("LISTINGFLOW_API", "http://127.0.0.1:3000")

# ── Conversation Memory ──────────────────────────────────────────────────────
MAX_CONVERSATION_HISTORY = 50   # Max messages to keep in context
PERSONALIZATION_ENABLED = True  # Track queries for personalization

# ── API Security ──────────────────────────────────────────────────────────────
VOICE_AGENT_API_KEY = os.getenv("VOICE_AGENT_API_KEY", "")  # Empty = no auth required
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")  # Comma-separated origins or "*"

# ── Session Management ────────────────────────────────────────────────────────
SESSION_EXPIRY_HOURS = int(os.getenv("SESSION_EXPIRY_HOURS", "24"))
SESSION_PERSIST = os.getenv("SESSION_PERSIST", "true").lower() == "true"
