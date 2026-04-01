let synced = false;
let syncPromise: Promise<void> | null = null;
const saveQueue = new Map<string, any>();
const deleteQueue = new Set<string>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function isScapexKey(key: string): boolean {
  return key.startsWith("scapex_");
}

export async function initDbStorage(): Promise<void> {
  if (synced) return;
  if (syncPromise) return syncPromise;
  syncPromise = (async () => {
    try {
      const res = await fetch("/api/app-data");
      if (!res.ok) return;
      const serverData: Record<string, any> = await res.json();
      const serverKeys = new Set(Object.keys(serverData));

      for (const [key, value] of Object.entries(serverData)) {
        localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
      }

      const localKeysToSync: Array<{ key: string; value: any }> = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !isScapexKey(key) || serverKeys.has(key)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        let parsed: any;
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        localKeysToSync.push({ key, value: parsed });
      }

      for (const { key, value } of localKeysToSync) {
        fetch(`/api/app-data/${encodeURIComponent(key)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        }).catch(() => {});
      }

      synced = true;
    } catch {
      console.warn("Failed to sync from server, using localStorage only");
    }
  })();
  return syncPromise;
}

function flushSaveQueue() {
  const toSave = Array.from(saveQueue.entries()).filter(([k]) => !deleteQueue.has(k));
  const toDelete = Array.from(deleteQueue);
  saveQueue.clear();
  deleteQueue.clear();

  for (const [key, value] of toSave) {
    fetch(`/api/app-data/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    }).catch(() => {});
  }

  for (const key of toDelete) {
    fetch(`/api/app-data/${encodeURIComponent(key)}`, { method: "DELETE" }).catch(() => {});
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSaveQueue, 300);
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (saveQueue.size > 0 || deleteQueue.size > 0) {
      flushSaveQueue();
    }
  });
}

export function dbSetItem(key: string, value: string): void {
  localStorage.setItem(key, value);
  if (isScapexKey(key)) {
    deleteQueue.delete(key);
    let parsed: any;
    try { parsed = JSON.parse(value); } catch { parsed = value; }
    saveQueue.set(key, parsed);
    scheduleSave();
  }
}

export function dbGetItem(key: string): string | null {
  return localStorage.getItem(key);
}

export function dbRemoveItem(key: string): void {
  localStorage.removeItem(key);
  if (isScapexKey(key)) {
    saveQueue.delete(key);
    deleteQueue.add(key);
    scheduleSave();
  }
}
