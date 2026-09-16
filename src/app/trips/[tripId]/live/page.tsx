import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveTripView } from "@/components/trips/LiveTripView";
import { formatTime } from "@/lib/format";
import { getSupabaseServerClient } from "@/lib/db/supabaseServerClient";
import { destinationService } from "@/lib/services/destinationService";
import { recommendationService } from "@/lib/services/recommendationService";
import { tripService } from "@/lib/services/tripService";

/** PRD Section 27 — Live Trip screen. */
export default async function LiveTripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await getSupabaseServerClient();

  let trip;
  try {
    trip = await tripService.getTrip(supabase, tripId);
  } catch {
    notFound();
  }

  const days = await tripService.listTripDays(supabase, tripId);
  const activitiesByDay = await Promise.all(days.map((day) => tripService.listActivitiesForDay(supabase, day.id)));
  const allActivities = activitiesByDay.flat();

  const titled = await Promise.all(
    allActivities.map(async (activity) => ({
      id: activity.id,
      startTime: activity.startTime,
      endTime: activity.endTime,
      title: activity.destinationId
        ? (await destinationService.getDestination(supabase, activity.destinationId)).name
        : (activity.notes ?? activity.activityType),
    })),
  );

  const currentActivity = titled[0] ?? null;
  const nextActivity = titled[1] ?? null;

  const recommendations = await recommendationService.listPendingForTrip(supabase, tripId);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href={`/trips/${tripId}`} className="text-sm text-slate-500 hover:text-brand-blue-600">
        ← Back to trip
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-brand-blue-700">Live Trip</h1>
      <p className="text-slate-500">{trip.name}</p>

      <div className="mt-6">
        <LiveTripView
          tripId={tripId}
          currentActivity={
            currentActivity && {
              ...currentActivity,
              title: `${currentActivity.title} (${formatTime(currentActivity.startTime)}–${formatTime(currentActivity.endTime)})`,
            }
          }
          nextActivity={
            nextActivity && {
              ...nextActivity,
              title: `${nextActivity.title} (${formatTime(nextActivity.startTime)})`,
            }
          }
          initialRecommendations={recommendations}
        />
      </div>
    </main>
  );
}
