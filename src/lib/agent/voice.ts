// ============================================================
// Unified Agent — Voice Mode (STT/TTS via Python Audio Service)
// ============================================================
// Handles speech-to-text and text-to-speech by proxying to the
// Python voice agent server. The agent logic stays in TypeScript;
// Python only processes audio.
// ============================================================

const VOICE_SERVICE_URL = process.env.NEXT_PUBLIC_VOICE_AGENT_URL || 'http://127.0.0.1:8768';
const VOICE_API_KEY = process.env.NEXT_PUBLIC_VOICE_AGENT_API_KEY || 'va-bridge-secret-key-2026';

// --- TTS Cache (in-memory LRU, avoids re-generating audio for repeated phrases) ---
const TTS_CACHE_MAX = 100;
const ttsCache = new Map<string, Blob>();

function ttsCacheKey(text: string): string {
  // Normalize whitespace and lowercase for cache hits
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function ttsCacheGet(text: string): Blob | undefined {
  const key = ttsCacheKey(text);
  const cached = ttsCache.get(key);
  if (cached) {
    // Move to end (LRU)
    ttsCache.delete(key);
    ttsCache.set(key, cached);
  }
  return cached;
}

function ttsCacheSet(text: string, blob: Blob): void {
  const key = ttsCacheKey(text);
  if (ttsCache.size >= TTS_CACHE_MAX) {
    // Evict oldest (first entry)
    const oldest = ttsCache.keys().next().value;
    if (oldest) ttsCache.delete(oldest);
  }
  ttsCache.set(key, blob);
}

/**
 * Speech-to-Text: Send audio blob to Python Whisper service.
 * Returns transcribed text.
 */
export async function speechToText(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const response = await fetch(`${VOICE_SERVICE_URL}/api/stt`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOICE_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`STT failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.text || '';
}

/**
 * Text-to-Speech: Send text to Python Edge TTS service.
 * Returns audio blob for playback. Uses LRU cache (100 entries)
 * to avoid re-generating audio for repeated phrases.
 */
export async function textToSpeech(text: string): Promise<Blob> {
  // Check cache first
  const cached = ttsCacheGet(text);
  if (cached) return cached;

  const response = await fetch(`${VOICE_SERVICE_URL}/api/tts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOICE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`TTS failed: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  ttsCacheSet(text, blob);
  return blob;
}

/**
 * Check if the Python voice service is available.
 */
export async function checkVoiceServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${VOICE_SERVICE_URL}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Play audio blob through the browser.
 * Returns a promise that resolves when playback completes.
 */
export function playAudio(audioBlob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Audio playback failed'));
    };
    audio.play().catch(reject);
  });
}

/**
 * Record audio from the microphone.
 * Returns a promise that resolves with the recorded audio blob.
 * Call stopRecording() to end recording.
 */
export function startRecording(): {
  stop: () => Promise<Blob>;
  cancel: () => void;
} {
  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let resolvePromise: ((blob: Blob) => void) | null = null;

  // Start recording
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      stream.getTracks().forEach((t) => t.stop());
      if (resolvePromise) resolvePromise(blob);
    };
    mediaRecorder.start();
  });

  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        resolvePromise = resolve;
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        } else {
          resolve(new Blob([], { type: 'audio/webm' }));
        }
      }),
    cancel: () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      chunks = [];
    },
  };
}
