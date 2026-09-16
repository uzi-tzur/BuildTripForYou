/**
 * /my-trip has no login, so "which trips are mine" can't come from an
 * account. Instead each device holds a short code (generated on the first
 * device, then typed into any other device to pair it) that scopes which
 * rows of mytrip_trip_list it can see — see src/lib/tripListSync.ts and
 * supabase/migrations/0006_mytrip_security_and_trip_list.sql.
 */
const SYNC_CODE_KEY = "gettrip4u-sync-code";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easy to read aloud/type

function randomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return code;
}

export function getOrCreateSyncCode(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(SYNC_CODE_KEY);
    if (existing) return existing;
    const code = randomCode();
    window.localStorage.setItem(SYNC_CODE_KEY, code);
    return code;
  } catch {
    return randomCode();
  }
}

export function setSyncCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (typeof window === "undefined") return normalized;
  try {
    window.localStorage.setItem(SYNC_CODE_KEY, normalized);
  } catch {
    // Storage unavailable — the code still applies for the rest of this session.
  }
  return normalized;
}
