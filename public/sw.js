/**
 * RealtorAI Service Worker
 * Handles: push notifications, offline TTS caching, background sync.
 */

const CACHE_NAME = "realtorai-voice-v1";
const TTS_CACHE = "realtorai-tts-v1";

// Assets to cache for offline voice agent
const PRECACHE_URLS = [
  "/manifest.json",
];

// Install — precache essential assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== TTS_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Push notification handler
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};

  const title = data.title || "RealtorAI";
  const options = {
    body: data.body || "You have a new notification",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "realtorai-notification",
    data: {
      url: data.url || "/",
      notification_id: data.notification_id,
    },
    actions: data.actions || [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  if (event.action === "dismiss") {
    // Mark as read server-side
    const notifId = event.notification.data?.notification_id;
    if (notifId) {
      fetch(`/api/voice-agent/notifications?action=read&notification_id=${notifId}`, {
        method: "PATCH",
      }).catch(() => {});
    }
    return;
  }

  // Open or focus the app
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Cache TTS audio responses for offline playback
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Cache Edge TTS responses
  if (url.pathname.includes("/api/tts") || url.hostname.includes("speech.platform.bing.com")) {
    event.respondWith(
      caches.open(TTS_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }

  // Network-first for API calls
  if (url.pathname.startsWith("/api/")) {
    return;
  }
});

// Background sync for failed voice commands
self.addEventListener("sync", (event) => {
  if (event.tag === "voice-command-retry") {
    event.waitUntil(retryPendingVoiceCommands());
  }
});

async function retryPendingVoiceCommands() {
  // Retrieve pending commands from IndexedDB and retry
  // This handles the case where a voice command was sent while offline
  try {
    const db = await openDB();
    const tx = db.transaction("pending-commands", "readonly");
    const store = tx.objectStore("pending-commands");
    const commands = await store.getAll();

    for (const cmd of commands) {
      try {
        await fetch("/api/voice-agent/quick", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: cmd.auth },
          body: JSON.stringify(cmd.payload),
        });
        // Remove from pending on success
        const deleteTx = db.transaction("pending-commands", "readwrite");
        deleteTx.objectStore("pending-commands").delete(cmd.id);
      } catch {
        // Will retry on next sync
      }
    }
  } catch {
    // IndexedDB not available
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("realtorai-sw", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("pending-commands", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
