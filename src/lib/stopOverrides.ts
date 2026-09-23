/**
 * Date/time edits to the pre-loaded (hardcoded) itinerary stops. The base
 * itinerary lives in src/data/coloradoTrip.ts and can't be mutated at
 * runtime, so an edit is stored here, keyed by the stop's stable id
 * (`${originalDayDate}-${index}`), and applied on top of the base data
 * when rendering — same "device-local, no backend" approach as
 * src/lib/customStops.ts.
 */
export interface StopOverride {
  // Present only once the user has edited the date/time — absent means
  // "use the itinerary's original date/time," so adding just a note
  // doesn't accidentally blank out a stop's original time (see
  // hasTimeOverride in TripView.tsx).
  date?: string; // YYYY-MM-DD, must be one of the trip's days
  time?: string | null; // "HH:MM" 24h, in the stop's original timezone offset
  note?: string | null; // personal note/story the user added for this stop
  title?: string; // renamed title — absent means "use the itinerary's original title"
  /** true if the user removed this pre-loaded stop from their itinerary. */
  deleted?: boolean;
  photoUrl?: string | null;
  photoCaption?: string | null;
}

function storageKey(tripId: string): string {
  return `gettrip4u-${tripId}-stop-overrides`;
}

export function loadStopOverrides(tripId: string): Record<string, StopOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(tripId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveStopOverrides(tripId: string, overrides: Record<string, StopOverride>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(tripId), JSON.stringify(overrides));
  } catch {
    // Storage unavailable — edit still applies for the rest of this session.
  }
}

/** Pulls the "-05:00" / "-06:00" suffix off an original stop's ISO time string. */
export function extractUtcOffset(iso: string | null): string {
  const match = iso?.match(/([+-]\d{2}:\d{2})$/);
  return match ? match[1]! : "-06:00";
}
