import type { FlightStatusResult } from "@/lib/providers/flights";

/**
 * The rule-based "flight status agent" — no model involved, each stage is a
 * plain function so it's testable and predictable:
 *
 *   status -> assessDisruption()        is the flight actually disrupted?
 *          -> proposeDelayChanges()     which planned activities does it collide with?
 *          -> banner (FlightDelayBanner) suggest a fix, ask the user
 *          -> user accepts              only then are the itinerary's times edited
 *
 * Nothing here ever changes the itinerary; it only produces proposals.
 */
export const IMPACT_THRESHOLD_MINUTES = 30;
/** Below this a delay is noise, not a disruption worth mentioning. */
export const DELAY_NOTICE_MINUTES = 15;

export type Disruption =
  | { kind: "none" }
  | { kind: "delay"; delayMinutes: number }
  | { kind: "cancelled" }
  | { kind: "diverted" };

function wallClockDiffMinutes(later: string | null, earlier: string | null): number | null {
  if (!later || !earlier) return null;
  return Math.round((Date.parse(`${later.slice(0, 16)}:00Z`) - Date.parse(`${earlier.slice(0, 16)}:00Z`)) / 60_000);
}

/** Uses only what the provider reported; never guesses a delay it wasn't given. */
export function assessDisruption(status: FlightStatusResult): Disruption {
  if (status.status === "cancelled") return { kind: "cancelled" };
  if (status.status === "diverted" || status.status === "incident") return { kind: "diverted" };
  if (status.status === "landed") return { kind: "none" };

  // Arrival delay is what collides with plans made for after landing; fall back to departure delay when only that is known.
  const delay =
    status.arrival.delayMinutes ??
    wallClockDiffMinutes(status.arrival.estimated, status.arrival.scheduled) ??
    status.departure.delayMinutes ??
    wallClockDiffMinutes(status.departure.estimated, status.departure.scheduled) ??
    0;
  return delay >= DELAY_NOTICE_MINUTES ? { kind: "delay", delayMinutes: delay } : { kind: "none" };
}

export interface ImpactCandidate {
  id: string;
  title: string;
  /** ISO 8601 with offset, or null if the stop has no fixed time. */
  time: string | null;
}

export interface ProposedChange {
  id: string;
  title: string;
  oldTime: string;
  newTime: string;
}

/** "2026-09-27T07:05…" -> "7:05 AM". Reads the wall-clock digits as written, so no timezone conversion happens. */
export function formatWallClock(value: string | null): string | null {
  if (!value) return null;
  const [hStr, mStr] = value.slice(11, 16).split(":");
  const h = Number(hStr);
  if (Number.isNaN(h) || mStr === undefined) return null;
  return `${h % 12 === 0 ? 12 : h % 12}:${mStr} ${h >= 12 ? "PM" : "AM"}`;
}

/** Adds minutes to an ISO timestamp's wall clock, keeping its own UTC offset ("…T09:00:00-06:00"). */
export function shiftIsoMinutes(iso: string, minutes: number): string {
  const offset = iso.match(/([+-]\d{2}:\d{2}|Z)$/)?.[0] ?? "";
  const [datePart, timePart] = iso.slice(0, 19).split("T") as [string, string];
  const [y, mo, d] = datePart.split("-").map(Number) as [number, number, number];
  const [h, mi, s] = timePart.split(":").map(Number) as [number, number, number];
  const shifted = new Date(Date.UTC(y, mo - 1, d, h, mi + minutes, s));
  return `${shifted.toISOString().slice(0, 19)}${offset}`;
}

export function proposeDelayChanges(input: {
  /** The flight's scheduled departure (ISO with offset). */
  departureIso: string;
  /** Scheduled landing (ISO with the arrival airport's offset). */
  arrivalIso: string;
  delayMinutes: number;
  /** Every other timed stop in the trip; the flight itself must not be included. */
  stops: ImpactCandidate[];
}): ProposedChange[] {
  if (input.delayMinutes < IMPACT_THRESHOLD_MINUTES) return [];

  const departureMs = Date.parse(input.departureIso);
  const scheduledArrivalMs = Date.parse(input.arrivalIso);
  if (Number.isNaN(departureMs) || Number.isNaN(scheduledArrivalMs)) return [];
  const newArrivalMs = scheduledArrivalMs + input.delayMinutes * 60_000;

  return input.stops
    .filter((s): s is ImpactCandidate & { time: string } => {
      if (!s.time) return false;
      const t = Date.parse(s.time);
      return t > departureMs && t < newArrivalMs;
    })
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
    .map((s) => ({
      id: s.id,
      title: s.title,
      oldTime: s.time,
      newTime: shiftIsoMinutes(s.time, input.delayMinutes),
    }));
}
