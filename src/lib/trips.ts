/**
 * The list of trips this no-login companion (/my-trip) knows about. One
 * trip — the real Colorado itinerary — ships as a hardcoded "seed" with a
 * full pre-loaded day-by-day plan (src/data/coloradoTrip.ts). Any trip the
 * user creates through the UI is just a name + date range stored in
 * localStorage; its content comes entirely from "+ Add activity" (see
 * src/lib/customStops.ts), same mechanism either way.
 */
import { COLORADO_TRIP_DAYS, TRIP_META, type TripDay } from "@/data/coloradoTrip";
import { loadCustomStops, saveCustomStops } from "@/lib/customStops";
import { loadStopOverrides, saveStopOverrides } from "@/lib/stopOverrides";

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
  /**
   * Which day-by-day itinerary this trip renders. "colorado-seed" means
   * "the real, hand-entered Colorado itinerary" (src/data/coloradoTrip.ts),
   * shifted by however far this trip's startDate has moved from the
   * original — set on the built-in trip itself and carried forward by any
   * trip duplicated from it, so a copy stays independently editable
   * without losing its content. Absent means a blank trip built entirely
   * from "+ Add activity".
   */
  sourceContent?: "colorado-seed";
  /** True once the user has removed this trip — kept, not erased, since the built-in trip's content can't be deleted from the app bundle. */
  hidden?: boolean;
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
  sourceContent: "colorado-seed",
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

/**
 * Merges the built-in Colorado trip into a trip list: a locally-stored
 * record with the seed's id AND its sourceContent marker (created the
 * first time the user renames, reschedules, or deletes it) overrides the
 * hardcoded default; otherwise the default is used as-is. Requiring the
 * marker (not just a matching id) guards against a row that reached this
 * device some other way — e.g. a plain cloud sync row, which never
 * carries sourceContent — silently taking over as "the itinerary." Hidden
 * means deleted — dropped from the list entirely, never surfaced.
 */
export function withSeedTrip(userTrips: TripMeta[]): TripMeta[] {
  const storedSeed = userTrips.find((t) => t.id === SEED_TRIP.id && t.sourceContent === "colorado-seed");
  const others = userTrips.filter((t) => t.id !== SEED_TRIP.id && !t.hidden);
  const seedEntry = storedSeed ? (storedSeed.hidden ? null : storedSeed) : SEED_TRIP;
  return seedEntry ? [seedEntry, ...others] : others;
}

/** The seed trip always appears first (unless deleted), followed by whatever the user created. */
export function loadAllTrips(): TripMeta[] {
  return withSeedTrip(loadUserTrips());
}

function upsertUserTrip(trip: TripMeta): void {
  const trips = loadUserTrips();
  const index = trips.findIndex((t) => t.id === trip.id);
  saveUserTrips(index === -1 ? [...trips, trip] : trips.map((t, i) => (i === index ? trip : t)));
}

/** The calendar date (YYYY-MM-DD) `days` after `dateStr` — pure date-part arithmetic, no timezone involved. */
export function shiftDateOnly(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number) as [number, number, number];
  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/** Whole calendar days between two YYYY-MM-DD dates (later minus earlier). */
export function diffDays(laterDate: string, earlierDate: string): number {
  const toUtcDays = (s: string) => {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, d) / 86_400_000;
  };
  return Math.round(toUtcDays(laterDate) - toUtcDays(earlierDate));
}

/** Shifts every day's date and every stop's timestamp by the same whole-day delta, keeping times-of-day and relative structure intact. */
function shiftTripDays(days: TripDay[], deltaDays: number): TripDay[] {
  return days.map((day, index) => {
    const date = shiftDateOnly(day.date, deltaDays);
    const weekday = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    return {
      ...day,
      date,
      dayLabel: `Day ${index + 1} · ${weekday}`,
      stops: day.stops.map((stop) => ({
        ...stop,
        time: stop.time ? shiftDateOnly(stop.time, deltaDays) + stop.time.slice(10) : null,
      })),
    };
  });
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

/** For the seed trip, this stores a tombstone (its content can't be erased) — otherwise it's dropped from the list outright. */
export function deleteTrip(id: string): void {
  if (id === SEED_TRIP.id) {
    const current = loadAllTrips().find((t) => t.id === id) ?? SEED_TRIP;
    upsertUserTrip({ ...current, hidden: true });
    return;
  }
  saveUserTrips(loadUserTrips().filter((t) => t.id !== id));
}

export function updateTrip(id: string, updates: { name?: string; startDate?: string; endDate?: string }): TripMeta {
  const current = loadAllTrips().find((t) => t.id === id);
  if (!current) throw new Error(`Trip not found: ${id}`);
  const next: TripMeta = { ...current, ...updates };
  // This content's day-by-day plan is a fixed-length, hand-entered itinerary
  // — it can be moved to a new start date, but not stretched or shrunk, so
  // the end date always follows the original span rather than whatever was passed in.
  if (next.sourceContent === "colorado-seed") {
    next.endDate = shiftDateOnly(next.startDate, diffDays(TRIP_META.endDate, TRIP_META.startDate));
  }
  upsertUserTrip(next);
  return next;
}

/** Creates an independent copy — same dates and content (including any of the source's own edits), new id, freely editable without touching the original. */
export function duplicateTrip(id: string): TripMeta {
  const source = loadAllTrips().find((t) => t.id === id);
  if (!source) throw new Error(`Trip not found: ${id}`);
  const copy: TripMeta = {
    ...source,
    id: `${slugify(source.name)}-${generateId()}`,
    name: `${source.name} (Copy)`,
    isSeed: false,
    hidden: false,
    createdAt: new Date().toISOString(),
  };
  saveUserTrips([...loadUserTrips(), copy]);
  saveCustomStops(copy.id, loadCustomStops(source.id));
  saveStopOverrides(copy.id, loadStopOverrides(source.id));
  return copy;
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

/** The seed trip's real, pre-loaded itinerary (shifted if its dates moved); any other trip starts blank. */
export function getTripDays(trip: TripMeta): TripDay[] {
  if (trip.sourceContent === "colorado-seed") {
    const delta = diffDays(trip.startDate, TRIP_META.startDate);
    return delta === 0 ? COLORADO_TRIP_DAYS : shiftTripDays(COLORADO_TRIP_DAYS, delta);
  }
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
