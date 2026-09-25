/**
 * Whole-trip backups for the no-login trip companion (/my-trip). A backup is
 * everything that makes up a trip — its list entry, the activities the user
 * added, and every edit layered on the built-in itinerary (renames, deletes,
 * time changes, notes, photos, day route links).
 *
 * Backups live on this device (localStorage) and can also be exported to a
 * file to carry to another device or keep safe; a file is validated field by
 * field on the way back in, since it's untrusted input that ends up in
 * storage and rendered on the page.
 */
import {
  CUSTOM_STOP_CATEGORIES,
  generateStopId,
  loadCustomStops,
  saveCustomStops,
  type CustomStop,
  type CustomStopCategory,
} from "@/lib/customStops";
import { isValidGoogleMapsUrl, loadStopOverrides, saveStopOverrides, type StopOverride } from "@/lib/stopOverrides";
import { loadAllTrips, restoreTrip, SEED_TRIP, type TripMeta } from "@/lib/trips";

export type BackupReason = "manual" | "before-delete";

export interface TripSnapshot {
  trip: TripMeta;
  customStops: CustomStop[];
  overrides: Record<string, StopOverride>;
}

export interface TripBackup extends TripSnapshot {
  id: string;
  createdAt: string;
  reason: BackupReason;
}

export const BACKUP_FILE_FORMAT = "buildtrip-trip-backup";
const BACKUP_FILE_VERSION = 1;

export interface TripBackupFile extends TripSnapshot {
  format: typeof BACKUP_FILE_FORMAT;
  version: typeof BACKUP_FILE_VERSION;
  exportedAt: string;
}

const STORAGE_KEY = "gettrip4u-trip-backups";
const MAX_BACKUPS_PER_TRIP = 10;
const MAX_FILE_CHARS = 2_000_000;
const MAX_CUSTOM_STOPS = 1000;

// --- storage ---------------------------------------------------------------

function readAll(): TripBackup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as TripBackup[]) : [];
  } catch {
    return [];
  }
}

function writeAll(backups: TripBackup[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(backups));
    return true;
  } catch {
    return false;
  }
}

/** Newest first. */
export function loadBackups(): TripBackup[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function snapshotTrip(tripId: string): TripSnapshot | null {
  const trip = loadAllTrips().find((t) => t.id === tripId);
  if (!trip) return null;
  return { trip, customStops: loadCustomStops(tripId), overrides: loadStopOverrides(tripId) };
}

/** Saves a backup of the trip as it is right now. Null if the trip doesn't exist or storage is full/unavailable. */
export function createBackup(tripId: string, reason: BackupReason): TripBackup | null {
  const snapshot = snapshotTrip(tripId);
  if (!snapshot) return null;

  const backup: TripBackup = { id: generateStopId(), createdAt: new Date().toISOString(), reason, ...snapshot };

  // Keep each trip's newest few, so backups can't grow without bound.
  const all = readAll();
  const forThisTrip = all
    .filter((b) => b.trip.id === tripId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_BACKUPS_PER_TRIP - 1);
  const keepIds = new Set(forThisTrip.map((b) => b.id));
  const next = [...all.filter((b) => b.trip.id !== tripId || keepIds.has(b.id)), backup];

  return writeAll(next) ? backup : null;
}

export function deleteBackup(backupId: string): void {
  writeAll(readAll().filter((b) => b.id !== backupId));
}

/** Puts a backup's trip and contents back. See restoreTrip for when it returns under a new id. */
export function restoreSnapshot(snapshot: TripSnapshot): TripMeta {
  const trip = restoreTrip(snapshot.trip);
  saveCustomStops(trip.id, snapshot.customStops);
  saveStopOverrides(trip.id, snapshot.overrides);
  return trip;
}

// --- file export / import --------------------------------------------------

export function buildBackupFile(snapshot: TripSnapshot): TripBackupFile {
  return { format: BACKUP_FILE_FORMAT, version: BACKUP_FILE_VERSION, exportedAt: new Date().toISOString(), ...snapshot };
}

export type ParseResult = { ok: true; snapshot: TripSnapshot } | { ok: false; error: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const SAFE_ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
const OFFSET = /^[+-]\d{2}:\d{2}$/;
/** Day-level keys ("day0"), stop keys ("day0-stop3"), and the older date-based stop keys ("2026-09-27-3"). */
const OVERRIDE_KEY = /^(day\d{1,3}(-stop\d{1,3})?|\d{4}-\d{2}-\d{2}-\d{1,3})$/;
const IMAGE_HOSTS = new Set(["images.pexels.com", "picsum.photos"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" ? value.slice(0, max) : null;
}

/** Only image hosts the app is configured to render (see next.config.ts) — anything else would break the page. */
function remoteImage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && IMAGE_HOSTS.has(url.hostname) ? value : null;
  } catch {
    return null;
  }
}

function heroImage(value: unknown): string | null {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) return value;
  return remoteImage(value);
}

function sanitizeTrip(value: unknown): TripMeta | null {
  if (!isObject(value)) return null;
  const { id, startDate, endDate } = value;
  const name = text(value.name, 200)?.trim();
  if (typeof id !== "string" || !SAFE_ID.test(id) || !name) return null;
  if (typeof startDate !== "string" || typeof endDate !== "string" || !DATE.test(startDate) || !DATE.test(endDate) || endDate < startDate) return null;

  return {
    id,
    name,
    subtitle: text(value.subtitle, 500) ?? "",
    startDate,
    endDate,
    heroImage: heroImage(value.heroImage),
    heroCaption: text(value.heroCaption, 200),
    timezoneOffset: typeof value.timezoneOffset === "string" && OFFSET.test(value.timezoneOffset) ? value.timezoneOffset : "-06:00",
    timezoneLabel: text(value.timezoneLabel, 50) ?? "local time",
    isSeed: id === SEED_TRIP.id,
    createdAt: text(value.createdAt, 40) ?? new Date().toISOString(),
    ...(value.sourceContent === "colorado-seed" ? { sourceContent: "colorado-seed" as const } : {}),
  };
}

function dateOrNull(value: unknown): string | null {
  return typeof value === "string" && DATE.test(value) ? value : null;
}

function timeOrNull(value: unknown): string | null {
  return typeof value === "string" && TIME.test(value) ? value : null;
}

function sanitizeCustomStop(value: unknown): CustomStop | null {
  if (!isObject(value)) return null;
  const id = text(value.id, 100);
  const title = text(value.title, 200)?.trim();
  const date = dateOrNull(value.date);
  if (!id || !title || !date) return null;

  const category: CustomStopCategory = (CUSTOM_STOP_CATEGORIES as readonly unknown[]).includes(value.category)
    ? (value.category as CustomStopCategory)
    : "other";

  return {
    id,
    date,
    time: timeOrNull(value.time),
    endDate: dateOrNull(value.endDate),
    endTime: timeOrNull(value.endTime),
    category,
    title,
    address: text(value.address, 500),
    phone: text(value.phone, 50),
    notes: text(value.notes, 5000),
    photoUrl: remoteImage(value.photoUrl),
    photoCaption: text(value.photoCaption, 200),
    airport: text(value.airport, 100),
    airline: text(value.airline, 100),
    flightNumber: text(value.flightNumber, 20),
    createdAt: text(value.createdAt, 40) ?? new Date().toISOString(),
  };
}

function sanitizeOverride(value: unknown): StopOverride | null {
  if (!isObject(value)) return null;
  const override: StopOverride = {};
  if ("date" in value) {
    const date = dateOrNull(value.date);
    if (date) override.date = date;
  }
  if ("time" in value) override.time = timeOrNull(value.time);
  if ("note" in value) override.note = text(value.note, 5000);
  if (typeof value.title === "string" && value.title.trim()) override.title = value.title.slice(0, 200);
  if (value.deleted === true) override.deleted = true;
  if ("photoUrl" in value) override.photoUrl = remoteImage(value.photoUrl);
  if ("photoCaption" in value) override.photoCaption = text(value.photoCaption, 200);
  if ("routeUrl" in value) {
    const url = typeof value.routeUrl === "string" && value.routeUrl.length <= 4000 && isValidGoogleMapsUrl(value.routeUrl) ? value.routeUrl : null;
    override.routeUrl = url;
  }
  return override;
}

/** Turns backup-file text into a snapshot, or says why it can't. Every field is checked and rebuilt — nothing from the file is trusted as-is. */
export function parseBackupFile(fileText: string): ParseResult {
  if (fileText.length > MAX_FILE_CHARS) return { ok: false, error: "That file is too large to be a trip backup." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(fileText);
  } catch {
    return { ok: false, error: "That isn't a valid backup file (it couldn't be read)." };
  }
  if (!isObject(parsed) || parsed.format !== BACKUP_FILE_FORMAT) {
    return { ok: false, error: "That isn't a BuildTripForYou trip backup file." };
  }
  if (parsed.version !== BACKUP_FILE_VERSION) {
    return { ok: false, error: "That backup was made by a different version and can't be restored here." };
  }

  const trip = sanitizeTrip(parsed.trip);
  if (!trip) return { ok: false, error: "The trip details in that backup are missing or damaged." };

  const rawStops = Array.isArray(parsed.customStops) ? parsed.customStops : [];
  if (rawStops.length > MAX_CUSTOM_STOPS) return { ok: false, error: "That backup has too many activities to be valid." };
  const customStops = rawStops.map(sanitizeCustomStop).filter((s): s is CustomStop => s !== null);

  const overrides: Record<string, StopOverride> = {};
  if (isObject(parsed.overrides)) {
    for (const [key, value] of Object.entries(parsed.overrides)) {
      if (!OVERRIDE_KEY.test(key)) continue;
      const override = sanitizeOverride(value);
      if (override) overrides[key] = override;
    }
  }

  return { ok: true, snapshot: { trip, customStops, overrides } };
}
