import { shiftIsoMinutes, wallClockDiffMinutes, type ImpactCandidate, type ProposedChange } from "@/lib/flightImpact";

/**
 * What the user confirmed about an activity once its time came: done, or
 * skipped. "Moved to a new time" isn't a status — it's a time edit, which
 * can raise the same kind of delay suggestion a late flight does.
 */
export type ActivityStatus = "done" | "skipped";

/**
 * How many minutes later an activity now starts, when it was moved to a
 * later time on the same day — otherwise null (moved earlier, to another
 * day, or it had no time). Wall-clock digits only, like the flight math.
 */
export function laterOnSameDayMinutes(oldIso: string | null, newDate: string, newTime: string): number | null {
  if (!oldIso || !newTime || oldIso.slice(0, 10) !== newDate) return null;
  const minutes = wallClockDiffMinutes(`${newDate}T${newTime}`, oldIso);
  return minutes !== null && minutes > 0 ? minutes : null;
}

/**
 * When an activity runs late, the plans after it are suggested to move back
 * by the same amount — the activity-level twin of proposeDelayChanges for
 * flights. Callers pass only the activities that can actually move (same
 * day, not the moved one, not flights, not already done or skipped).
 * It stops at the next flight (`untilIso`): what comes after a flight
 * depends on when it lands, which the flight's own delay check covers.
 * Nothing changes until the user accepts.
 */
export function proposeFollowingShift(input: {
  movedFromIso: string;
  delayMinutes: number;
  stops: ImpactCandidate[];
  untilIso?: string | null;
}): ProposedChange[] {
  const fromMs = Date.parse(input.movedFromIso);
  if (input.delayMinutes <= 0 || Number.isNaN(fromMs)) return [];
  const untilMs = input.untilIso ? Date.parse(input.untilIso) : Infinity;
  return input.stops
    .filter((s): s is ImpactCandidate & { time: string } => {
      if (s.time === null) return false;
      const t = Date.parse(s.time);
      return t > fromMs && t < untilMs;
    })
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
    .map((s) => ({ id: s.id, title: s.title, oldTime: s.time, newTime: shiftIsoMinutes(s.time, input.delayMinutes) }));
}
