import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { destinationService } from "@/lib/services/destinationService";
import { preferenceService } from "@/lib/services/preferenceService";
import { tripService } from "@/lib/services/tripService";
import { isAnthropicConfigured } from "@/lib/ai/client";
import { planTrip } from "@/lib/ai/agents/tripPlanner";
import type { Recommendation } from "@/lib/types";

type DB = SupabaseClient<Database>;

/**
 * AI Orchestrator (PRD Section 20, Section 50). The single entry point
 * between the app and the specialized agents. Per Rule 6, agents only ever
 * produce structured output — this module is the one place allowed to
 * call the service layer to persist it, and only for the "build the
 * initial plan" flow the user already approved by submitting the trip
 * form. In-trip changes (monitor/optimize) instead return Recommendations
 * that still require explicit user approval (PRD Section 17) before
 * a recommendation-resolve route applies them.
 */
export type OrchestratorResult =
  | { intent: "plan_trip"; tripId: string; usedMockAi: boolean; dayCount: number; activityCount: number }
  | { intent: "monitor_trip"; recommendations: Recommendation[] }
  | { intent: "optimize_itinerary"; recommendations: Recommendation[] }
  | { intent: "assistant_query"; reply: string; usedMockAi: boolean };

export async function planAndPersistTrip(db: DB, tripId: string): Promise<OrchestratorResult> {
  const trip = await tripService.getTrip(db, tripId);
  const preferences = await preferenceService.getLatestForUser(db, trip.userId);

  const candidateQuery = [trip.destination, ...(preferences?.interests ?? [])].join(" ");
  const candidateDestinations = await destinationService.searchDestinations(db, candidateQuery);

  const { plan, usedMockAi } = await planTrip({
    trip,
    preferences: {
      travelerType: preferences?.travelerType ?? "solo",
      interests: preferences?.interests ?? [],
      pace: preferences?.pace ?? "moderate",
      budgetLevel: preferences?.budgetLevel ?? null,
    },
    candidateDestinations,
  });

  const validDestinationIds = new Set(candidateDestinations.map((d) => d.id));
  let activityCount = 0;

  for (const day of plan.days) {
    const date = new Date(trip.startDate);
    date.setDate(date.getDate() + (day.dayNumber - 1));
    const isoDate = date.toISOString().slice(0, 10);

    const tripDay = await tripService.createTripDay(db, tripId, isoDate, day.dayNumber);

    let sequence = 0;
    for (const activity of day.activities) {
      const destinationId =
        activity.destinationId && validDestinationIds.has(activity.destinationId)
          ? activity.destinationId
          : null;

      await tripService.createActivity(db, {
        tripDayId: tripDay.id,
        destinationId,
        startTime: `${isoDate}T${activity.startTime}:00`,
        endTime: `${isoDate}T${activity.endTime}:00`,
        durationMinutes: minutesBetween(activity.startTime, activity.endTime),
        activityType: activity.activityType,
        sequence: sequence++,
        notes: activity.notes ?? (destinationId ? null : activity.title),
      });
      activityCount += 1;
    }
  }

  await tripService.updateTrip(db, tripId, { status: "planned" });

  return { intent: "plan_trip", tripId, usedMockAi, dayCount: plan.days.length, activityCount };
}

function minutesBetween(start: string, end: string): number {
  const [sh = 0, sm = 0] = start.split(":").map(Number);
  const [eh = 0, em = 0] = end.split(":").map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

export function isAiPlanningLive(): boolean {
  return isAnthropicConfigured();
}
