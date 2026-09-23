/**
 * Cloud sync for the list of user-created trips itself (not their
 * day-by-day content — see src/lib/mytripSync.ts for that). Without this,
 * "+ New trip" only ever wrote to that one device's localStorage, so a
 * trip created on a phone had no way to appear on any other device — each
 * device would even mint its own id for "the same" trip if created twice.
 * Rows are scoped by a sync code (src/lib/syncCode.ts) and can only be read
 * through get_family_trips(sync_code), never a plain table listing, so one
 * family's trip names/dates aren't visible to another.
 */
import { getMytripSupabaseClient, isMytripSupabaseConfigured } from "@/lib/mytripSupabase";
import type { TripMeta } from "@/lib/trips";

export function cloudTripListAvailable(): boolean {
  return isMytripSupabaseConfigured();
}

export type PullFamilyTripsResult = { ok: true; data: TripMeta[] } | { ok: false };

export async function pullFamilyTrips(syncCode: string): Promise<PullFamilyTripsResult> {
  if (!cloudTripListAvailable() || !syncCode) return { ok: false };
  try {
    const supabase = getMytripSupabaseClient();
    const { data, error } = await supabase.rpc("get_family_trips", { p_sync_code: syncCode });
    if (error || !data) return { ok: false };
    return {
      ok: true,
      data: data.map((row) => ({
        id: row.id,
        name: row.name,
        subtitle: row.subtitle,
        startDate: row.start_date,
        endDate: row.end_date,
        heroImage: row.hero_image,
        heroCaption: row.hero_caption,
        timezoneOffset: row.timezone_offset,
        timezoneLabel: row.timezone_label,
        isSeed: false,
        createdAt: row.created_at,
        sourceContent: row.source_content === "colorado-seed" ? "colorado-seed" : undefined,
        hidden: Boolean(row.hidden),
      })),
    };
  } catch {
    return { ok: false };
  }
}

/**
 * Writes through save_family_trip(...) instead of a direct table
 * insert/update/upsert — see the comment on pushTripSync in
 * src/lib/mytripSync.ts for why: a plain UPDATE can never affect a row on
 * a table with no select policy (confirmed with Prefer: count=exact
 * showing zero rows matched despite an unconditional update policy), and
 * this table has no select policy on purpose. The function bypasses RLS
 * internally instead.
 */
export async function pushTripToCloud(trip: TripMeta, syncCode: string): Promise<boolean> {
  if (!cloudTripListAvailable() || !syncCode) return false;
  try {
    const supabase = getMytripSupabaseClient();
    const { error } = await supabase.rpc("save_family_trip", {
      p_id: trip.id,
      p_sync_code: syncCode,
      p_name: trip.name,
      p_subtitle: trip.subtitle,
      p_start_date: trip.startDate,
      p_end_date: trip.endDate,
      p_hero_image: trip.heroImage,
      p_hero_caption: trip.heroCaption,
      p_timezone_offset: trip.timezoneOffset,
      p_timezone_label: trip.timezoneLabel,
      p_source_content: trip.sourceContent ?? null,
      p_hidden: trip.hidden ?? false,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteTripFromCloud(tripId: string): Promise<boolean> {
  if (!cloudTripListAvailable()) return false;
  try {
    const supabase = getMytripSupabaseClient();
    const { error } = await supabase.rpc("delete_family_trip", { p_id: tripId });
    return !error;
  } catch {
    return false;
  }
}
