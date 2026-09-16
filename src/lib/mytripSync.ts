/**
 * Cloud sync for the no-login trip companion (/my-trip). Custom activities
 * and date/time edits (src/lib/customStops.ts, src/lib/stopOverrides.ts)
 * are always written to localStorage first — that never depended on a
 * network call — and, when Supabase is configured, mirrored to the
 * `mytrip_sync` table (supabase/migrations/0005_mytrip_sync.sql) keyed by
 * trip id so every device opening the same trip link sees the same data,
 * instead of each phone/browser only ever seeing its own local copy.
 */
import type { CustomStop } from "@/lib/customStops";
import { getMytripSupabaseClient, isMytripSupabaseConfigured } from "@/lib/mytripSupabase";
import type { StopOverride } from "@/lib/stopOverrides";

export interface TripSyncState {
  customStops: CustomStop[];
  overrides: Record<string, StopOverride>;
  updatedAt: string;
}

export function cloudSyncAvailable(): boolean {
  return isMytripSupabaseConfigured();
}

/**
 * `ok: false` means the pull itself failed (no table, no network, RLS
 * denied, ...) and callers must NOT treat that as "nothing to sync" — the
 * whole point of this feature is to stop silently losing edits, so a real
 * failure has to surface as an error, not a false "Synced".
 * `ok: true, data: null` means the request succeeded and there's simply no
 * row for this trip yet (first time this trip has ever synced).
 */
export type PullResult = { ok: true; data: TripSyncState | null } | { ok: false };

/**
 * Reads through the get_mytrip_sync(trip_id) function instead of a plain
 * table select — the table itself has no select policy (see
 * supabase/migrations/0006_mytrip_security_and_trip_list.sql), so this is
 * the only way to read a row, and it can only ever return the one trip
 * asked for, never a full listing.
 */
export async function pullTripSync(tripId: string): Promise<PullResult> {
  if (!cloudSyncAvailable()) return { ok: false };
  try {
    const supabase = getMytripSupabaseClient();
    const { data, error } = await supabase.rpc("get_mytrip_sync", { p_trip_id: tripId });
    if (error || !data) return { ok: false };
    const row = data[0];
    if (!row) return { ok: true, data: null };
    return {
      ok: true,
      data: {
        customStops: Array.isArray(row.custom_stops) ? (row.custom_stops as CustomStop[]) : [],
        overrides:
          row.stop_overrides && typeof row.stop_overrides === "object"
            ? (row.stop_overrides as Record<string, StopOverride>)
            : {},
        updatedAt: row.updated_at,
      },
    };
  } catch {
    return { ok: false };
  }
}

/**
 * Writes through the save_mytrip_sync(...) function instead of a direct
 * table insert/update/upsert. Postgres RLS requires a row to be visible
 * under a SELECT policy before an UPDATE can affect it — confirmed with
 * `Prefer: count=exact`, which showed a plain update matching zero rows
 * despite an unconditional `using (true)` update policy — and this table
 * has no select policy on purpose (closing an enumeration hole; see
 * supabase/migrations/0006). There's no RLS shape that's both writable and
 * "readable only by exact id, never listable," so writes go through a
 * security-definer function the same way reads do (get_mytrip_sync),
 * bypassing RLS internally instead of fighting it.
 */
export async function pushTripSync(
  tripId: string,
  customStops: CustomStop[],
  overrides: Record<string, StopOverride>,
): Promise<boolean> {
  if (!cloudSyncAvailable()) return false;
  try {
    const supabase = getMytripSupabaseClient();
    const { error } = await supabase.rpc("save_mytrip_sync", {
      p_trip_id: tripId,
      p_custom_stops: customStops,
      p_stop_overrides: overrides,
    });
    return !error;
  } catch {
    return false;
  }
}
