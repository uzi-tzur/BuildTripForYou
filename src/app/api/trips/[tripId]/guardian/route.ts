import { NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/supabaseServerClient";
import { monitorTrip } from "@/lib/ai/agents/tripGuardian";
import { destinationService } from "@/lib/services/destinationService";
import { recommendationService } from "@/lib/services/recommendationService";
import { tripService } from "@/lib/services/tripService";
import type { Activity, Destination } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;

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

  const body = (await request.json().catch(() => ({}))) as { simulatedDelayMinutes?: number };

  try {
    const trip = await tripService.getTrip(supabase, tripId);
    const days = await tripService.listTripDays(supabase, tripId);
    const activitiesByDay = await Promise.all(days.map((day) => tripService.listActivitiesForDay(supabase, day.id)));
    const activities = activitiesByDay.flat();

    const destinationsById = new Map<string, Destination>();
    for (const activity of activities) {
      if (activity.destinationId && !destinationsById.has(activity.destinationId)) {
        destinationsById.set(activity.destinationId, await destinationService.getDestination(supabase, activity.destinationId));
      }
    }

    const enrichedActivities: Array<Activity & { destination?: Destination }> = activities.map((a) => ({
      ...a,
      destination: a.destinationId ? destinationsById.get(a.destinationId) : undefined,
    }));

    const candidates = await monitorTrip({
      trip,
      activities: enrichedActivities,
      simulatedDelayMinutes: body.simulatedDelayMinutes,
    });

    const recommendations = await Promise.all(
      candidates.map((c) =>
        recommendationService.createRecommendation(supabase, {
          tripId,
          activityId: c.activityId,
          title: c.title,
          reasons: c.reasons,
          impactSummary: c.impactSummary,
          payload: c.payload,
        }),
      ),
    );

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Trip Guardian check failed", error);
    const message = error instanceof Error ? error.message : "Trip Guardian check failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
