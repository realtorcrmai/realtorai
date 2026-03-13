/**
 * Voice Agent Browser Client
 * Supports text chat with streaming SSE, multi-provider status,
 * session persistence, and voice (Daily.co WebRTC) modes.
 */

// ── State ──────────────────────────────────────────────────────────────────
const STATE = {
    mode: 'realtor',
    sessionId: null,
    connected: false,
    inCall: false,
    streaming: false,
    apiBase: window.VOICE_AGENT_API || 'http://127.0.0.1:8768',
    apiKey: window.VOICE_AGENT_KEY || '',
    dailyCallObject: null,
};

// ── DOM References ─────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const callBtn         = () => $('#callBtn');
const callStatus      = () => $('#callStatus');
const chatMessages    = () => $('#chatMessages');
const chatInput       = () => $('#chatInput');
const sendBtn         = () => $('#sendBtn');
const statusDot       = () => $('#statusDot');
const statusText      = () => $('#statusText');
const modelInfo       = () => $('#modelInfo');
const sessionInfo     = () => $('#sessionInfo');
const visualizer      = () => $('#visualizer');
const headerSubtitle  = () => $('#headerSubtitle');
const typingIndicator = () => $('#typingIndicator');
const streamToggle    = () => $('#streamToggle');
const llmDot          = () => $('#llmDot');
const llmName         = () => $('#llmName');
const ttsDot          = () => $('#ttsDot');
const ttsName         = () => $('#ttsName');
const sttDot          = () => $('#sttDot');
const sttName         = () => $('#sttName');


// ── Auth Header Builder ────────────────────────────────────────────────────
function authHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (STATE.apiKey) {
        headers['Authorization'] = `Bearer ${STATE.apiKey}`;
    }
    return headers;
}


// ── Mode Selection ─────────────────────────────────────────────────────────
function setMode(mode) {
    STATE.mode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    if (STATE.sessionId) {
        endSession();
    }
    localStorage.setItem('voiceAgent_mode', mode);
    addSystemMessage(`Switched to ${mode} mode.`);
}


// ── Health Check ───────────────────────────────────────────────────────────
async function checkHealth() {
    try {
        const resp = await fetch(`${STATE.apiBase}/api/health`, {
            headers: STATE.apiKey ? { 'Authorization': `Bearer ${STATE.apiKey}` } : {},
        });
        const data = await resp.json();
        if (data.ok) {
            statusDot().classList.add('ok');
            statusText().textContent = 'Connected';
            modelInfo().textContent = `${data.llm_provider} | v${data.version}`;
            headerSubtitle().textContent = `${data.llm_provider} | ${data.mode} mode`;
            STATE.connected = true;
            return true;
        }
    } catch (e) {
        console.warn('[Health] Server not reachable:', e.message);
    }
    statusDot().classList.remove('ok');
    statusText().textContent = 'Disconnected';
    modelInfo().textContent = 'Server not running';
    headerSubtitle().textContent = 'Disconnected';
    STATE.connected = false;
    return false;
}


// ── Provider Status ────────────────────────────────────────────────────────
async function fetchProviders() {
    try {
        const resp = await fetch(`${STATE.apiBase}/api/providers`, {
            headers: STATE.apiKey ? { 'Authorization': `Bearer ${STATE.apiKey}` } : {},
        });
        const data = await resp.json();

        // LLM
        if (data.llm) {
            const active = data.llm.active || '—';
            const available = data.llm.providers?.[active] ?? false;
            llmName().textContent = active;
            llmDot().classList.toggle('ok', available);
        }

        // TTS
        if (data.tts) {
            const active = data.tts.active || '—';
            const available = data.tts.providers?.[active] ?? false;
            ttsName().textContent = active;
            ttsDot().classList.toggle('ok', available);
        }

        // STT
        if (data.stt) {
            const active = data.stt.active || '—';
            const available = data.stt.providers?.[active] ?? false;
            sttName().textContent = active;
            sttDot().classList.toggle('ok', available);
        }
    } catch (e) {
        console.warn('[Providers] Could not fetch provider status:', e.message);
    }
}


// ── Session Management ─────────────────────────────────────────────────────
async function createSession() {
    try {
        const resumeId = localStorage.getItem('voiceAgent_sessionId');
        const body = { mode: STATE.mode };
        if (resumeId) {
            body.resume_session_id = resumeId;
        }

        const resp = await fetch(`${STATE.apiBase}/api/session/create`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(body),
        });
        const data = await resp.json();
        if (data.ok) {
            STATE.sessionId = data.session_id;
            localStorage.setItem('voiceAgent_sessionId', data.session_id);
            chatInput().disabled = false;
            sendBtn().disabled = false;
            sessionInfo().textContent = `Session: ${data.session_id.slice(0, 8)}...`;

            const status = data.resumed
                ? `Session resumed (${data.mode} mode, ${data.message_count} messages). ID: ${data.session_id.slice(0,8)}...`
                : `Session started (${STATE.mode} mode). ID: ${data.session_id.slice(0,8)}...`;
            addSystemMessage(status);
            return true;
        }
    } catch (e) {
        addSystemMessage(`Failed to create session: ${e.message}`);
    }
    return false;
}

function endSession() {
    STATE.sessionId = null;
    localStorage.removeItem('voiceAgent_sessionId');
    chatInput().disabled = true;
    sendBtn().disabled = true;
    callBtn().classList.remove('active');
    callStatus().textContent = 'Click to start a session';
    callStatus().classList.remove('connected');
    visualizer().classList.remove('active');
    sessionInfo().textContent = 'No session';
    STATE.inCall = false;
}


// ── Toggle Call ────────────────────────────────────────────────────────────
async function toggleCall() {
    if (STATE.inCall) {
        endSession();
        addSystemMessage('Session ended.');
        return;
    }

    const healthy = await checkHealth();
    if (!healthy) {
        addSystemMessage('Cannot connect to voice agent server. Make sure it is running on port 8768.');
        return;
    }

    const ok = await createSession();
    if (ok) {
        STATE.inCall = true;
        callBtn().classList.add('active');
        callStatus().textContent = 'Session active — type or speak';
        callStatus().classList.add('connected');
        fetchProviders();
    }
}


// ── Send Text Message ──────────────────────────────────────────────────────
async function sendMessage() {
    const input = chatInput();
    const msg = input.value.trim();
    if (!msg || !STATE.sessionId) return;

    input.value = '';
    addMessage('user', msg);
    sendBtn().disabled = true;
    input.disabled = true;

    const useStreaming = streamToggle().checked;

    if (useStreaming) {
        await sendMessageStream(msg);
    } else {
        await sendMessageSync(msg);
    }

    sendBtn().disabled = false;
    input.disabled = false;
    input.focus();
}


// ── Synchronous Chat ───────────────────────────────────────────────────────
async function sendMessageSync(msg) {
    showTyping(true);
    try {
        const resp = await fetch(`${STATE.apiBase}/api/chat`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                session_id: STATE.sessionId,
                message: msg,
            }),
        });
        const data = await resp.json();

        showTyping(false);

        if (data.error) {
            addMessage('system', `Error: ${data.error}${data.hint ? ' (' + data.hint + ')' : ''}`);
        } else {
            if (data.provider) {
                addMessage('assistant', data.response, `via ${data.provider}`);
            } else {
                addMessage('assistant', data.response);
            }
        }
    } catch (e) {
        showTyping(false);
        addMessage('system', `Network error: ${e.message}`);
    }
}


// ── Streaming Chat (SSE) ───────────────────────────────────────────────────
async function sendMessageStream(msg) {
    showTyping(true);
    STATE.streaming = true;

    let streamDiv = null;
    let fullContent = '';

    try {
        const resp = await fetch(`${STATE.apiBase}/api/chat/stream`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                session_id: STATE.sessionId,
                message: msg,
            }),
        });

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            showTyping(false);
            STATE.streaming = false;
            addMessage('system', `Error: ${errData.error || resp.statusText}`);
            return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        showTyping(false);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const jsonStr = line.slice(6).trim();
                if (!jsonStr) continue;

                try {
                    const chunk = JSON.parse(jsonStr);

                    // Tool call notification
                    if (chunk.tool) {
                        addMessage('tool', `Calling tool: ${chunk.tool}`);
                        continue;
                    }

                    // Error
                    if (chunk.error) {
                        addMessage('system', `Error: ${chunk.error}`);
                        continue;
                    }

                    // Fields extracted
                    if (chunk.fields && Object.keys(chunk.fields).length > 0) {
                        // Fields come at the end; could display in a structured way
                        continue;
                    }

                    // Stream token
                    const token = chunk.token || '';
                    if (token || !chunk.done) {
                        if (!streamDiv) {
                            streamDiv = createStreamMessage();
                        }
                        fullContent += token;
                        streamDiv.textContent = fullContent;
                        streamDiv.classList.add('streaming');
                        scrollToBottom();
                    }

                    if (chunk.done) {
                        if (streamDiv) {
                            streamDiv.classList.remove('streaming');
                        }
                        streamDiv = null;
                        fullContent = '';
                    }
                } catch (parseErr) {
                    console.warn('[Stream] Parse error:', parseErr, jsonStr);
                }
            }
        }

        // Finalize any remaining stream div
        if (streamDiv) {
            streamDiv.classList.remove('streaming');
        }

    } catch (e) {
        showTyping(false);
        if (streamDiv) {
            streamDiv.classList.remove('streaming');
        }
        addMessage('system', `Stream error: ${e.message}`);
    }

    STATE.streaming = false;
}


// ── Chat UI Helpers ────────────────────────────────────────────────────────
function addMessage(role, content, meta) {
    const container = chatMessages();
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.textContent = content;

    if (meta) {
        const metaSpan = document.createElement('span');
        metaSpan.style.cssText = 'display:block; font-size:10px; opacity:0.6; margin-top:4px;';
        metaSpan.textContent = meta;
        div.appendChild(metaSpan);
    }

    container.appendChild(div);
    scrollToBottom();
}

function addSystemMessage(text) {
    addMessage('system', text);
}

function createStreamMessage() {
    const container = chatMessages();
    const div = document.createElement('div');
    div.className = 'msg assistant';
    container.appendChild(div);
    scrollToBottom();
    return div;
}

function scrollToBottom() {
    const container = chatMessages();
    container.scrollTop = container.scrollHeight;
}

function showTyping(show) {
    const indicator = typingIndicator();
    if (indicator) {
        indicator.classList.toggle('visible', show);
    }
    if (show) scrollToBottom();
}


// ── Daily.co WebRTC (placeholder for voice mode) ──────────────────────────
async function tryJoinDailyRoom() {
    console.log('[Daily] WebRTC join not yet implemented — using text mode');
}


// ── Keyboard Shortcuts ──────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to toggle call
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        toggleCall();
    }
});


// ── Init ───────────────────────────────────────────────────────────────────
(async function init() {
    // Restore saved mode
    const savedMode = localStorage.getItem('voiceAgent_mode');
    if (savedMode && ['realtor', 'client', 'generic'].includes(savedMode)) {
        STATE.mode = savedMode;
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === savedMode);
        });
    }

    const healthy = await checkHealth();
    if (healthy) {
        fetchProviders();
    }

    // Re-check health every 15s
    setInterval(checkHealth, 15000);
    // Refresh providers every 60s
    setInterval(fetchProviders, 60000);
})();
