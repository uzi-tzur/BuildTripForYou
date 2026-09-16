import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { formatDistance, formatDuration, formatTime } from "@/lib/format";
import { getSupabaseServerClient } from "@/lib/db/supabaseServerClient";
import { destinationService } from "@/lib/services/destinationService";
import { routingService } from "@/lib/services/routingService";
import { tripService } from "@/lib/services/tripService";
import { analyzeActivityWeather } from "@/lib/ai/agents/weather";
import type { Activity, Destination } from "@/lib/types";

const ACTIVITY_ICON: Record<Activity["activityType"], string> = {
  travel: "🚗",
  meal: "🍴",
  attraction: "📍",
  lodging: "🏨",
  free_time: "🧭",
  other: "•",
};

export default async function DailyItineraryPage({
  params,
}: {
  params: Promise<{ tripId: string; dayNumber: string }>;
}) {
  const { tripId, dayNumber } = await params;
  const supabase = await getSupabaseServerClient();

  let trip;
  try {
    trip = await tripService.getTrip(supabase, tripId);
  } catch {
    notFound();
  }

  const days = await tripService.listTripDays(supabase, tripId);
  const day = days.find((d) => d.dayNumber === Number(dayNumber));
  if (!day) notFound();

  const activities = await tripService.listActivitiesForDay(supabase, day.id);
  const destinationsById = new Map<string, Destination>();
  for (const activity of activities) {
    if (activity.destinationId && !destinationsById.has(activity.destinationId)) {
      destinationsById.set(activity.destinationId, await destinationService.getDestination(supabase, activity.destinationId));
    }
  }

  const usingMockRouting = !process.env.GOOGLE_MAPS_API_KEY;
  const usingMockWeather = !process.env.WEATHER_API_KEY;

  const weatherFlags = await analyzeActivityWeather(
    activities.map((a) => ({ ...a, destination: a.destinationId ? destinationsById.get(a.destinationId) : undefined })),
  );
  const weatherFlagByActivity = new Map(weatherFlags.map((f) => [f.activityId, f]));

  // Compute a travel leg between consecutive activities that both have a
  // known destination, so the timeline shows real transit time (PRD
  // Section 26 example: "🚗 Hotel → South Rim · Travel: 35 min").
  const travelLegs = new Map<string, { distanceMeters: number; durationSeconds: number }>();
  for (let i = 0; i < activities.length - 1; i++) {
    const from = activities[i]!;
    const to = activities[i + 1]!;
    const fromDest = from.destinationId ? destinationsById.get(from.destinationId) : undefined;
    const toDest = to.destinationId ? destinationsById.get(to.destinationId) : undefined;
    if (!fromDest || !toDest) continue;

    const route = await routingService.getRoute(
      supabase,
      fromDest.address || fromDest.name,
      toDest.address || toDest.name,
      trip.transportationMode,
      tripId,
    );
    travelLegs.set(to.id, { distanceMeters: route.distanceMeters, durationSeconds: route.estimatedDurationSeconds });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href={`/trips/${tripId}`} className="text-sm text-slate-500 hover:text-brand-blue-600">
        ← Back to trip
      </Link>
      <div className="mt-2 flex items-center gap-2">
        <h1 className="text-2xl font-bold text-brand-blue-700">Day {day.dayNumber}</h1>
        {usingMockRouting && <DemoBadge label="Travel times estimated" />}
      </div>
      <p className="text-slate-500">{day.date}</p>
      {day.summary && <p className="mt-2 text-slate-600">{day.summary}</p>}

      {weatherFlags.length > 0 && (
        <div className="mt-4 space-y-2">
          {weatherFlags.map((flag) => (
            <div
              key={flag.activityId}
              className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              <span>⚠️</span>
              <div>
                <p>{flag.message}</p>
                <p className="text-xs text-amber-700">{flag.recommendedAction}</p>
              </div>
              {usingMockWeather && <DemoBadge label="Estimated" />}
            </div>
          ))}
        </div>
      )}

      <ol className="mt-6 space-y-4 border-l border-slate-200 pl-5">
        {activities.map((activity) => {
          const destination = activity.destinationId ? destinationsById.get(activity.destinationId) : undefined;
          const leg = travelLegs.get(activity.id);
          const weatherFlag = weatherFlagByActivity.get(activity.id);

          return (
            <li key={activity.id} className="relative">
              <span className="absolute -left-[27px] flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm ring-2 ring-brand-blue-200">
                {ACTIVITY_ICON[activity.activityType]}
              </span>

              {leg && (
                <p className="mb-1 text-xs text-slate-400">
                  🚗 Travel: {formatDuration(leg.durationSeconds)} ({formatDistance(leg.distanceMeters)})
                </p>
              )}

              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    {formatTime(activity.startTime)} – {formatTime(activity.endTime)}
                  </span>
                  <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
                    {weatherFlag && <span title={weatherFlag.message}>⚠️</span>}
                    {activity.activityType}
                  </span>
                </div>

                {destination ? (
                  <Link
                    href={`/destinations/${destination.id}`}
                    className="mt-1 block font-semibold text-brand-blue-700 hover:underline"
                  >
                    {destination.name}
                  </Link>
                ) : (
                  <p className="mt-1 font-semibold text-slate-800">{activity.notes ?? "Free time"}</p>
                )}

                {activity.notes && destination && <p className="mt-1 text-sm text-slate-500">{activity.notes}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
