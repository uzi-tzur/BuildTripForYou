/**
 * "Places to visit" — the cities/areas the user wants this trip to cover
 * (e.g. Tokyo, Kyoto, Osaka, Fuji), added one by one at the top of the trip
 * and ticked off once planned. Stored as a trip-level entry in the per-trip
 * stop overrides (key PLACES_KEY, like the packing checklist), so it's saved
 * on the device, synced to the cloud and included in backups with no
 * schema change.
 */
export interface PlaceToVisit {
  id: string;
  name: string;
  /** Ticked once this place is planned into the itinerary. */
  done: boolean;
}

/** Can't collide with a stop id (`${date}-${index}`), a day entry (`day${index}`), the checklist ("prep") or the summary. */
export const PLACES_KEY = "places";

export const MAX_PLACES = 100;
export const MAX_PLACE_NAME = 120;

export function generatePlaceId(): string {
  return `place-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Rebuilds the list from untrusted data (cloud row, backup file), dropping anything malformed. */
export function sanitizePlaces(value: unknown): PlaceToVisit[] {
  if (!Array.isArray(value)) return [];
  const places: PlaceToVisit[] = [];
  for (const raw of value.slice(0, MAX_PLACES)) {
    if (!raw || typeof raw !== "object") continue;
    const { id, name, done } = raw as Record<string, unknown>;
    if (typeof id !== "string" || !id || id.length > 100) continue;
    if (typeof name !== "string" || !name.trim()) continue;
    places.push({ id, name: name.trim().slice(0, MAX_PLACE_NAME), done: done === true });
  }
  return places;
}
