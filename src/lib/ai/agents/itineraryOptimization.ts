import type { Activity } from "@/lib/types";

export type OptimizationTrigger =
  | { kind: "weather_reschedule"; activityId: string }
  | { kind: "delay_replan"; delayMinutes: number };

export interface ProposedActivityChange {
  activityId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  sequence: number;
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

/**
 * Itinerary Optimization Agent (PRD Section 19, Section 16 "Dynamic
 * Itinerary Optimization"). Given one day's activities (sorted by
 * sequence) and a trigger, computes a new schedule. Pure computation
 * only (Rule 6) — the resolve route applies these via tripService after
 * the user clicks "Apply Update" (PRD Section 17).
 */
export function optimizeSchedule(
  dayActivities: Activity[],
  trigger: OptimizationTrigger,
): ProposedActivityChange[] {
  if (trigger.kind === "delay_replan") {
    return dayActivities.map((activity) => ({
      activityId: activity.id,
      startTime: addMinutes(activity.startTime, trigger.delayMinutes),
      endTime: addMinutes(activity.endTime, trigger.delayMinutes),
      durationMinutes: activity.durationMinutes,
      sequence: activity.sequence,
    }));
  }

  // weather_reschedule: move only the flagged activity to the end of the
  // day, after a short buffer — everything else stays put (PRD's example:
  // "+0 additional driving, no reservations affected").
  const target = dayActivities.find((a) => a.id === trigger.activityId);
  if (!target) return [];

  const others = dayActivities.filter((a) => a.id !== trigger.activityId);
  const last = others.reduce<Activity | null>(
    (latest, a) => (!latest || new Date(a.endTime) > new Date(latest.endTime) ? a : latest),
    null,
  );

  const durationMs = new Date(target.endTime).getTime() - new Date(target.startTime).getTime();
  const bufferMinutes = 30;
  const newStart = last ? addMinutes(last.endTime, bufferMinutes) : target.startTime;
  const newEnd = new Date(new Date(newStart).getTime() + durationMs).toISOString();
  const maxSequence = Math.max(...dayActivities.map((a) => a.sequence));

  return [
    {
      activityId: target.id,
      startTime: newStart,
      endTime: newEnd,
      durationMinutes: target.durationMinutes,
      sequence: maxSequence + 1,
    },
  ];
}
