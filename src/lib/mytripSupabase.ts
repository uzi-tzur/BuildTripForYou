/**
 * A dedicated Supabase client for /my-trip's sync tables — deliberately
 * separate from the cookie/session-aware browser client used by the
 * login-based /trips side (src/lib/db/supabaseClient.ts), since /my-trip
 * has no login at all.
 *
 * Every call this client makes goes through an RPC function
 * (get_mytrip_sync, save_mytrip_sync, get_family_trips, save_family_trip,
 * delete_family_trip — see supabase/migrations/0006 and 0010), never a
 * direct table select/insert/update/delete. mytrip_sync and
 * mytrip_trip_list have no RLS policies of their own on purpose: they're
 * meant to be readable by exact id/code only, never listable, and — as it
 * turns out — Postgres RLS can't express "writable but not listable" as a
 * plain policy either (an UPDATE can't affect a row that isn't visible
 * under a SELECT policy, even when the UPDATE policy's own condition is
 * unconditionally true). The RPC functions are security definer, so they
 * bypass RLS entirely rather than fighting it.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

export function isMytripSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

let client: ReturnType<typeof createClient<Database>> | null = null;

export function getMytripSupabaseClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  client = createClient<Database>(url, anonKey);
  return client;
}
