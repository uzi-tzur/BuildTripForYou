import { NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/supabaseServerClient";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { optimizeSchedule, type OptimizationTrigger } from "@/lib/ai/agents/itineraryOptimization";
import { recommendationService } from "@/lib/services/recommendationService";
import { tripService } from "@/lib/services/tripService";

type DB = SupabaseClient<Database>;

interface GuardianPayload {
  kind: "weather_reschedule" | "delay_replan";
  activityId?: string;
  delayMinutes?: number;
}

function isGuardianPayload(value: unknown): value is GuardianPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    ((value as { kind: unknown }).kind === "weather_reschedule" ||
      (value as { kind: unknown }).kind === "delay_replan")
  );
}

async function findDayIdForActivity(db: DB, tripId: string, activityId: string): Promise<string | null> {
  const days = await tripService.listTripDays(db, tripId);
  for (const day of days) {
    const activities = await tripService.listActivitiesForDay(db, day.id);
    if (activities.some((a) => a.id === activityId)) return day.id;
  }
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string; recommendationId: string }> },
) {
  const { tripId, recommendationId } = await params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { decision } = (await request.json().catch(() => ({}))) as { decision?: "approved" | "rejected" };
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "decision must be 'approved' or 'rejected'." }, { status: 400 });
  }

  try {
    const recommendation = await recommendationService.getRecommendation(supabase, recommendationId);

    if (decision === "rejected") {
      const resolved = await recommendationService.resolveRecommendation(supabase, recommendationId, "rejected");
      return NextResponse.json({ recommendation: resolved, changes: [] });
    }

    // Per PRD Rule 6, this is the one place allowed to apply an AI-proposed
    // change to trip data — and only because the user just clicked "Apply
    // Update" (PRD Section 17).
    let dayId: string | null = null;
    let trigger: OptimizationTrigger | null = null;

    if (isGuardianPayload(recommendation.payload)) {
      const payload = recommendation.payload;
      if (payload.kind === "weather_reschedule" && payload.activityId) {
        dayId = await findDayIdForActivity(supabase, tripId, payload.activityId);
        trigger = { kind: "weather_reschedule", activityId: payload.activityId };
      } else if (payload.kind === "delay_replan" && payload.delayMinutes) {
        const days = await tripService.listTripDays(supabase, tripId);
        dayId = days[0]?.id ?? null;
        trigger = { kind: "delay_replan", delayMinutes: payload.delayMinutes };
      }
    }

    if (!dayId || !trigger) {
      throw new Error("Could not determine which day/activity this recommendation applies to.");
    }

    const dayActivities = await tripService.listActivitiesForDay(supabase, dayId);
    const changes = optimizeSchedule(dayActivities, trigger);

    for (const change of changes) {
      await tripService.updateActivity(supabase, change.activityId, {
        startTime: change.startTime,
        endTime: change.endTime,
        durationMinutes: change.durationMinutes,
        sequence: change.sequence,
      });
    }

    const resolved = await recommendationService.resolveRecommendation(supabase, recommendationId, "approved");
    return NextResponse.json({ recommendation: resolved, changes });
  } catch (error) {
    console.error("Resolving recommendation failed", error);
    const message = error instanceof Error ? error.message : "Could not apply this change.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
