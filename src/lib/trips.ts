/**
 * The list of trips this no-login companion (/my-trip) knows about. One
 * trip — the real Colorado itinerary — ships as a hardcoded "seed" with a
 * full pre-loaded day-by-day plan (src/data/coloradoTrip.ts). Any trip the
 * user creates through the UI is just a name + date range stored in
 * localStorage; its content comes entirely from "+ Add activity" (see
 * src/lib/customStops.ts), same mechanism either way.
 */
import { COLORADO_TRIP_DAYS, TRIP_META, type TripDay } from "@/data/coloradoTrip";

export interface TripMeta {
  id: string;
  name: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  heroImage: string | null;
  /** Simple caption shown under the hero photo, e.g. the place name. */
  heroCaption: string | null;
  /** UTC offset applied to every time entered for this trip, e.g. "-06:00". */
  timezoneOffset: string;
  /** Shown next to times, e.g. "10:00 AM (Colorado time)". */
  timezoneLabel: string;
  isSeed: boolean;
  createdAt: string;
}

export const SEED_TRIP: TripMeta = {
  id: "colorado-fall-2026",
  name: TRIP_META.title,
  subtitle: TRIP_META.subtitle,
  startDate: TRIP_META.startDate,
  endDate: TRIP_META.endDate,
  heroImage: "/sapphire-point-overlook.jpg",
  heroCaption: "Sapphire Point Overlook",
  timezoneOffset: "-06:00",
  timezoneLabel: "Colorado time",
  isSeed: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const TRIPS_STORAGE_KEY = "gettrip4u-trips";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().slice(0, 8);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return slug || "trip";
}

export function loadUserTrips(): TripMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRIPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUserTrips(trips: TripMeta[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));
  } catch {
    // Storage unavailable — the trip still exists for the rest of this session.
  }
}

/** Overwrites this device's local trip list, e.g. after merging with a cloud pull. */
export function replaceUserTrips(trips: TripMeta[]): void {
  saveUserTrips(trips);
}

/** The seed trip always appears first, followed by whatever the user created. */
export function loadAllTrips(): TripMeta[] {
  return [SEED_TRIP, ...loadUserTrips()];
}

export function createTrip(input: { name: string; subtitle: string; startDate: string; endDate: string }): TripMeta {
  const trip: TripMeta = {
    id: `${slugify(input.name)}-${generateId()}`,
    name: input.name,
    subtitle: input.subtitle,
    startDate: input.startDate,
    endDate: input.endDate,
    heroImage: null,
    heroCaption: null,
    timezoneOffset: "-06:00",
    timezoneLabel: "local time",
    isSeed: false,
    createdAt: new Date().toISOString(),
  };
  saveUserTrips([...loadUserTrips(), trip]);
  return trip;
}

/** No-op for the seed trip — it isn't stored, so there's nothing to remove. */
export function deleteTrip(id: string): void {
  saveUserTrips(loadUserTrips().filter((t) => t.id !== id));
}

const SYNCED_IDS_KEY = "gettrip4u-trips-synced-ids";

/**
 * Which trip ids this device has confirmed pushed to the cloud at least
 * once. Used only to decide, when merging with a cloud pull, whether a
 * trip missing from the cloud is "new here, needs pushing" or "used to be
 * synced and was deleted elsewhere" — without this, a stale local copy of
 * a trip deleted on another device would keep getting re-uploaded forever.
 */
export function loadSyncedTripIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SYNCED_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markTripSynced(id: string): void {
  if (typeof window === "undefined") return;
  const ids = loadSyncedTripIds();
  ids.add(id);
  try {
    window.localStorage.setItem(SYNCED_IDS_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage unavailable — worst case this trip gets re-pushed next time, which is harmless.
  }
}

/** The seed trip's real, pre-loaded itinerary; any other trip starts blank. */
export function getTripDays(trip: TripMeta): TripDay[] {
  if (trip.id === SEED_TRIP.id) return COLORADO_TRIP_DAYS;
  return generateBlankTripDays(trip.startDate, trip.endDate);
}

function generateBlankTripDays(startDate: string, endDate: string): TripDay[] {
  const days: TripDay[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  let dayNumber = 1;

  while (cursor <= end && dayNumber <= 60) {
    const dateStr = cursor.toISOString().slice(0, 10);
    days.push({
      date: dateStr,
      dayLabel: `Day ${dayNumber} · ${cursor.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}`,
      title: "",
      weatherLocations: [],
      stops: [],
    });
    cursor.setDate(cursor.getDate() + 1);
    dayNumber += 1;
  }

  return days;
}
