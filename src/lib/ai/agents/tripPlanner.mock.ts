import type { Destination } from "@/lib/types";
import type { TripPlan } from "@/lib/ai/schemas";

const DAY_TEMPLATE: Array<{ type: TripPlan["days"][number]["activities"][number]["activityType"]; start: string; end: string; title: string }> = [
  { type: "meal", start: "08:00", end: "09:00", title: "Breakfast" },
  { type: "attraction", start: "09:30", end: "11:30", title: "Morning activity" },
  { type: "meal", start: "12:00", end: "13:00", title: "Lunch" },
  { type: "attraction", start: "13:30", end: "16:00", title: "Afternoon activity" },
  { type: "meal", start: "18:30", end: "20:00", title: "Dinner" },
];

/**
 * Deterministic fallback used when ANTHROPIC_API_KEY isn't set — a simple
 * round-robin template, not a real AI plan. Callers must surface a "Demo
 * mode" badge alongside anything built from this (PRD Rule 5).
 */
export function generateMockTripPlan(dayCount: number, candidates: Destination[]): TripPlan {
  let candidateIndex = 0;
  const nextCandidate = (): Destination | undefined => {
    if (candidates.length === 0) return undefined;
    const candidate = candidates[candidateIndex % candidates.length];
    candidateIndex += 1;
    return candidate;
  };

  const days = Array.from({ length: dayCount }, (_, i) => {
    const dayNumber = i + 1;
    const activities = DAY_TEMPLATE.map((slot) => {
      const isAttraction = slot.type === "attraction";
      const destination = isAttraction ? nextCandidate() : undefined;
      return {
        destinationId: destination?.id ?? null,
        activityType: slot.type,
        title: destination?.name ?? slot.title,
        startTime: slot.start,
        endTime: slot.end,
        notes: isAttraction && !destination ? "No candidate destination available." : null,
      };
    });

    return {
      dayNumber,
      summary: `Day ${dayNumber} — a mix of sightseeing and meals.`,
      activities,
    };
  });

  return {
    overallSummary: `A ${dayCount}-day template itinerary generated without a live AI connection.`,
    days,
  };
}
