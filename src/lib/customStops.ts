/**
 * User-added activities for the no-login trip companion (/my-trip).
 * Persisted in the browser's localStorage — this page has no backend,
 * so "add a missing activity" means "remember it on this device."
 */
export const CUSTOM_STOP_CATEGORIES = [
  "rental_car",
  "hotel",
  "hiking",
  "restaurant",
  "city",
  "attraction",
  "airport",
  "other",
] as const;

export type CustomStopCategory = (typeof CUSTOM_STOP_CATEGORIES)[number];

export const CUSTOM_STOP_CATEGORY_LABEL: Record<CustomStopCategory, string> = {
  rental_car: "Rental Car",
  hotel: "Hotel",
  hiking: "Hiking",
  restaurant: "Restaurant",
  city: "City",
  attraction: "Attraction",
  airport: "Airport",
  other: "Other",
};

export const CUSTOM_STOP_CATEGORY_ICON: Record<CustomStopCategory, string> = {
  rental_car: "🚙",
  hotel: "🏨",
  hiking: "🥾",
  restaurant: "🍽️",
  city: "🏙️",
  attraction: "🎟️",
  airport: "🛫",
  other: "📌",
};

/**
 * How the end-of-span entry (auto-added on endDate) is labeled — e.g. a
 * rental car's start entry reads "Rental Car: Hertz" and its end entry
 * reads "Return: Hertz".
 */
export const CUSTOM_STOP_END_LABEL: Record<CustomStopCategory, string> = {
  rental_car: "Return",
  hotel: "Check out",
  hiking: "End",
  restaurant: "End",
  city: "Depart",
  attraction: "End",
  airport: "Departure",
  other: "End",
};

export interface CustomStop {
  id: string;
  date: string; // start date, matches a TripDay.date, e.g. "2026-09-28"
  time: string | null; // start time, "HH:MM" 24h, Colorado local (Mountain Time), or null
  endDate: string | null; // end date, e.g. rental car drop-off / hotel check-out
  endTime: string | null; // end time, "HH:MM" 24h, Colorado local, or null
  category: CustomStopCategory;
  title: string;
  address: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
}

/** Each trip's custom stops are stored under their own key, keyed by trip id. */
function storageKey(tripId: string): string {
  return `gettrip4u-${tripId}-custom-stops`;
}

export function loadCustomStops(tripId: string): CustomStop[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(tripId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Migrate entries saved before endDate/endTime/phone existed.
    return parsed.map((stop) => ({
      endDate: null,
      endTime: null,
      phone: null,
      ...stop,
    }));
  } catch {
    return [];
  }
}

export function saveCustomStops(tripId: string, stops: CustomStop[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(tripId), JSON.stringify(stops));
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — fail silently,
    // the activity still shows for the rest of this session.
  }
}

/** Default to Mountain Time (UTC-6) unless the trip specifies another offset. */
export function customStopToIso(date: string, time: string, utcOffset = "-06:00"): string {
  return `${date}T${time}:00${utcOffset}`;
}

/**
 * `crypto.randomUUID()` only exists in a "secure context" (HTTPS, or the
 * origin `localhost` itself) — opening this page from a phone over Wi-Fi
 * via the dev machine's LAN IP (e.g. http://192.168.x.x:3000) is NOT a
 * secure context, so that API is silently undefined there. Fall back to a
 * plain random id so "Add" still works from a phone during the trip.
 */
export function generateStopId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `stop-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
