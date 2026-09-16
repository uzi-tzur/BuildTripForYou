import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { destinationFromRow, destinationToInsertRow } from "@/lib/db/mappers";
import { getPlacesProvider } from "@/lib/providers/places";
import type { Destination } from "@/lib/types";

type DB = SupabaseClient<Database>;

/**
 * Destination Service (PRD Section 42). Searches via the active
 * PlacesProvider (real Google Places or the mock — see
 * src/lib/providers/places/index.ts) and caches results in `destinations`
 * so later phases (itinerary, map, bookings) can reference a stable
 * internal id via foreign keys.
 */
export const destinationService = {
  async searchDestinations(db: DB, query: string, near?: { latitude: number; longitude: number }): Promise<Destination[]> {
    const provider = getPlacesProvider();
    const results = await provider.searchPlaces({
      query,
      latitude: near?.latitude,
      longitude: near?.longitude,
    });

    const cached = await Promise.all(
      results.map((destination) => cacheDestination(db, destination)),
    );
    return cached;
  },

  async getDestination(db: DB, destinationId: string): Promise<Destination> {
    const { data, error } = await db.from("destinations").select("*").eq("id", destinationId).single();
    if (error) throw error;
    return destinationFromRow(data);
  },
};

async function cacheDestination(db: DB, destination: Destination): Promise<Destination> {
  const externalId = destination.id;
  const { id: _providerId, freshness: _freshness, ...rest } = destination;

  const { data, error } = await db
    .from("destinations")
    .upsert(destinationToInsertRow(rest, externalId), { onConflict: "external_id" })
    .select("*")
    .single();

  if (error) throw error;
  return destinationFromRow(data);
}
