/**
 * Lightweight, frontend-only duplicate-upload detection.
 *
 * Strategy:
 *   1. SHA-256 the first 512 KB of the blob (fast on mobile, ~5 ms).
 *   2. Store seen hashes in localStorage, scoped per user per calendar day.
 *   3. On midnight rollover the old record is automatically discarded.
 *
 * No backend changes required — this is a first-line client-side guard.
 */

/** Returns a hex SHA-256 digest of the first 512 KB of a Blob. */
export async function hashBlob(blob: Blob): Promise<string> {
  const SAMPLE = 512 * 1024;
  const buf = await blob.slice(0, SAMPLE).arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── localStorage helpers ────────────────────────────────────────────────────

interface HashStore {
  date: string;   // "YYYY-MM-DD" — invalidates on day rollover
  hashes: string[];
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function lsKey(userId: string): string {
  return `uplhash_${userId}`;
}

function loadStore(userId: string): HashStore {
  try {
    const raw = localStorage.getItem(lsKey(userId));
    if (!raw) return { date: todayDate(), hashes: [] };
    const parsed = JSON.parse(raw) as HashStore;
    // Expire previous day's data automatically
    if (parsed.date !== todayDate()) return { date: todayDate(), hashes: [] };
    return parsed;
  } catch {
    return { date: todayDate(), hashes: [] };
  }
}

function saveStore(userId: string, store: HashStore): void {
  try {
    localStorage.setItem(lsKey(userId), JSON.stringify(store));
  } catch {
    // Quota exceeded — non-fatal, just skip caching
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Returns true if this exact image was already uploaded today by this user. */
export function wasDuplicateToday(userId: string, hash: string): boolean {
  return loadStore(userId).hashes.includes(hash);
}

/** Call after a successful upload to register the hash for today. */
export function markHashUsed(userId: string, hash: string): void {
  const store = loadStore(userId);
  if (!store.hashes.includes(hash)) {
    store.hashes.push(hash);
    saveStore(userId, store);
  }
}
