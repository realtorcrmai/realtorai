/**
 * Daily.co WebRTC integration — room management via REST API.
 * Used server-side to create/delete rooms and generate meeting tokens.
 * Browser-side uses @daily-co/daily-js SDK (see useWebRTC hook).
 */

const DAILY_API_BASE = "https://api.daily.co/v1";

function getHeaders(): HeadersInit {
  const key = process.env.DAILY_API_KEY;
  if (!key) throw new Error("DAILY_API_KEY not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function getDomain(): string {
  return process.env.DAILY_DOMAIN || "listingflow.daily.co";
}

export async function createRoom(sessionId: string): Promise<{
  name: string;
  url: string;
  id: string;
}> {
  const roomName = `va-${sessionId.slice(0, 8)}-${Date.now()}`;

  const res = await fetch(`${DAILY_API_BASE}/rooms`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      name: roomName,
      properties: {
        max_participants: 2,
        enable_recording: false,
        start_video_off: true,
        start_audio_off: false,
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
        eject_at_room_exp: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Daily.co room creation failed: ${res.status} ${err}`);
  }

  const room = await res.json();
  return {
    name: room.name,
    url: `https://${getDomain()}/${room.name}`,
    id: room.id,
  };
}

export async function createMeetingToken(roomName: string): Promise<string> {
  const res = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        is_owner: true,
        enable_recording: false,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Daily.co token creation failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.token;
}

export async function deleteRoom(roomName: string): Promise<void> {
  const res = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  // 404 is fine — room may already be expired/deleted
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Daily.co room deletion failed: ${res.status} ${err}`);
  }
}

export async function getRoomInfo(roomName: string): Promise<{
  name: string;
  url: string;
  created_at: string;
  config: Record<string, unknown>;
} | null> {
  const res = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Daily.co room info failed: ${res.status} ${err}`);
  }

  return res.json();
}
