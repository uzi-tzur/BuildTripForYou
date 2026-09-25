/**
 * Rule-based "will this delay hurt my plans?" check for a flight — no model
 * involved: if the flight is late enough, any activity scheduled between
 * takeoff and the *new* landing time can't happen when planned, so each one
 * is proposed to move back by the same delay. The user always approves the
 * change; nothing is rescheduled automatically.
 */
export const IMPACT_THRESHOLD_MINUTES = 30;

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
  /** Scheduled landing as a time of day with the arrival airport's offset, e.g. "08:10:00-06:00" — same date as departure. */
  arrivalClock: string;
  delayMinutes: number;
  /** Every other timed stop in the trip; the flight itself must not be included. */
  stops: ImpactCandidate[];
}): ProposedChange[] {
  if (input.delayMinutes < IMPACT_THRESHOLD_MINUTES) return [];

  const departureMs = Date.parse(input.departureIso);
  const scheduledArrivalMs = Date.parse(`${input.departureIso.slice(0, 10)}T${input.arrivalClock}`);
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
