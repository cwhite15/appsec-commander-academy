const endpoint = "https://appsec.community/api/activity";
const participantKey = "appsec-community-participant-v1";
const sessionKey = "appsec-community-session-v1";
const queueKey = "appsec-community-events-v1";
const sentKey = "appsec-community-sent-v1";
const optOutKey = "appsec-community-analytics-opt-out";

function uuid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function storageId(storage, key) {
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    const value = uuid();
    storage.setItem(key, value);
    return value;
  } catch { return uuid(); }
}

function readQueue() {
  try { return JSON.parse(localStorage.getItem(queueKey)) || []; } catch { return []; }
}

function writeQueue(queue) {
  try { localStorage.setItem(queueKey, JSON.stringify(queue.slice(-100))); } catch { /* telemetry must never interrupt an academy */ }
}

function sentMarkers() {
  try { return new Set(JSON.parse(sessionStorage.getItem(sentKey)) || []); } catch { return new Set(); }
}

function markSent(marker) {
  const markers = sentMarkers();
  markers.add(marker);
  try { sessionStorage.setItem(sentKey, JSON.stringify([...markers].slice(-250))); } catch { /* no-op */ }
}

export function resetActivityIdentity() {
  try { localStorage.removeItem(participantKey); } catch { /* no-op */ }
  try {
    sessionStorage.removeItem(sessionKey);
    sessionStorage.removeItem(sentKey);
  } catch { /* no-op */ }
}

let flushPromise = null;

async function post(event) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
    credentials: "omit"
  });
  if (!response.ok) throw new Error("tracker unavailable");
}

export function flushActivityQueue() {
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    const queue = readQueue();
    const attempted = new Set(queue.map((event) => event.event_id));
    const remaining = [];
    for (const event of queue) {
      try { await post(event); } catch { remaining.push(event); }
    }
    const addedDuringFlush = readQueue().filter((event) => !attempted.has(event.event_id));
    writeQueue([...remaining, ...addedDuringFlush]);
  })().finally(() => { flushPromise = null; });
  return flushPromise;
}

export function recordActivity(track, activityId, event, context = {}) {
  try { if (localStorage.getItem(optOutKey) === "true") return; } catch { /* continue without preference storage */ }
  const marker = `${track}:${activityId}:${event}`;
  if (sentMarkers().has(marker)) return;
  const payload = {
    schema_version: 1,
    event_id: uuid(),
    participant_id: storageId(localStorage, participantKey),
    session_id: storageId(sessionStorage, sessionKey),
    track,
    activity_id: activityId,
    event,
    occurred_at: new Date().toISOString(),
    context
  };
  writeQueue([...readQueue(), payload]);
  markSent(marker);
  void flushActivityQueue();
}

window.addEventListener("online", () => void flushActivityQueue());
void flushActivityQueue();
