/**
 * Passcode gate for the no-login trip companion (/my-trip) — it holds real
 * personal data (confirmation numbers, phone numbers, flight details) with
 * no account behind it, so anyone with the link could otherwise see it.
 * MYTRIP_ACCESS_CODE (server-side only) is the shared secret; a visitor who
 * enters it gets a cookie holding its hash, never the code itself, checked
 * on every request by src/middleware.ts.
 */
export const ACCESS_COOKIE_NAME = "mytrip_access";

/** Uses Web Crypto (available in both the Edge middleware runtime and Node's route handlers) so one implementation works in both places. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getConfiguredAccessCode(): string | null {
  const code = process.env.MYTRIP_ACCESS_CODE?.trim();
  return code ? code : null;
}
