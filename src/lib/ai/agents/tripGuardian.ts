import { analyzeActivityWeather } from "@/lib/ai/agents/weather";
import type { Activity, Destination, Trip } from "@/lib/types";

export interface GuardianCandidate {
  activityId: string | null;
  title: string;
  reasons: string[];
  impactSummary: string;
  payload: { kind: "weather_reschedule" | "delay_replan"; activityId?: string; delayMinutes?: number };
}

export interface MonitorTripInput {
  trip: Trip;
  activities: Array<Activity & { destination?: Destination }>;
  /** Dev/demo affordance (PRD Section 9 Live Trip screen) — there's no
   * real GPS/traffic feed, so a manual "Simulate delay" control supplies
   * this instead of fabricating live telemetry. */
  simulatedDelayMinutes?: number;
}

/**
 * Trip Guardian Agent (PRD Section 13). Monitors an active trip and
 * raises candidate recommendations when it detects a problem. Returns
 * structured candidates only (Rule 6) — the caller (guardian API route)
 * persists them as pending Recommendations; nothing is applied until the
 * user approves via the Change Approval screen (PRD Section 31).
 */
export async function monitorTrip(input: MonitorTripInput): Promise<GuardianCandidate[]> {
  const candidates: GuardianCandidate[] = [];

  const weatherFlags = await analyzeActivityWeather(input.activities);
  for (const flag of weatherFlags) {
    const activity = input.activities.find((a) => a.id === flag.activityId);
    candidates.push({
      activityId: flag.activityId,
      title: `Weather risk: ${activity?.destination?.name ?? "planned activity"}`,
      reasons: [flag.message, flag.recommendedAction],
      impactSummary: "Moves this activity to a lower-risk time; other activities that day may shift.",
      payload: { kind: "weather_reschedule", activityId: flag.activityId },
    });
  }

  if (input.simulatedDelayMinutes && input.simulatedDelayMinutes > 0) {
    candidates.push({
      activityId: null,
      title: `You are running about ${input.simulatedDelayMinutes} minutes behind schedule`,
      reasons: [
        `Simulated delay of ${input.simulatedDelayMinutes} minutes.`,
        "Remaining activities today may need to shift later.",
      ],
      impactSummary: "Recalculates the rest of today's schedule; no activities are removed unless necessary.",
      payload: { kind: "delay_replan", delayMinutes: input.simulatedDelayMinutes },
    });
  }

  return candidates;
}
