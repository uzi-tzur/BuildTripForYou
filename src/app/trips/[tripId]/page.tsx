import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { formatDistance, formatDuration } from "@/lib/format";
import { getSupabaseServerClient } from "@/lib/db/supabaseServerClient";
import { destinationService } from "@/lib/services/destinationService";
import { routingService } from "@/lib/services/routingService";
import { tripService } from "@/lib/services/tripService";
import { weatherService } from "@/lib/services/weatherService";

export default async function TripOverviewPage({ params }: { params: Promise<{ tripId: string }> }) {
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
  const destinationCount = new Set(allActivities.map((a) => a.destinationId).filter(Boolean)).size;

  const usingMockRouting = !process.env.GOOGLE_MAPS_API_KEY;
  let overallRoute = null;
  try {
    overallRoute = await routingService.getRoute(supabase, trip.origin, trip.destination, trip.transportationMode, tripId);
  } catch {
    overallRoute = null;
  }

  const usingMockWeather = !process.env.WEATHER_API_KEY;
  const firstDestinationId = allActivities.find((a) => a.destinationId)?.destinationId ?? null;
  let weatherSummary: string | null = null;
  if (firstDestinationId) {
    try {
      const destination = await destinationService.getDestination(supabase, firstDestinationId);
      const forecast = await weatherService.getForecast(destination.latitude, destination.longitude, trip.startDate);
      weatherSummary = `${forecast.conditionSummary}, ${Math.round(forecast.temperatureC ?? 0)}°C near ${destination.name}`;
    } catch {
      weatherSummary = null;
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-brand-blue-700">{trip.name}</h1>
          <p className="text-slate-600">
            {trip.origin} → {trip.destination} · {trip.startDate} to {trip.endDate}
          </p>
        </div>
        <span className="rounded-full bg-brand-green-100 px-3 py-1 text-sm font-medium text-brand-green-700">
          {trip.status}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Days" value={String(days.length)} />
        <Stat label="Destinations" value={String(destinationCount)} />
        <Stat label="Activities" value={String(allActivities.length)} />
        <Stat label="Budget" value={trip.budget !== null ? `$${trip.budget}` : "—"} />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 p-4">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-semibold text-slate-800">Overall route</h2>
          {usingMockRouting && <DemoBadge label="Estimated — connect GOOGLE_MAPS_API_KEY for real routing" />}
        </div>
        {overallRoute ? (
          <p className="text-slate-600">
            {formatDistance(overallRoute.distanceMeters)} · about {formatDuration(overallRoute.estimatedDurationSeconds)}{" "}
            driving from {trip.origin} to {trip.destination}
          </p>
        ) : (
          <p className="text-slate-400">Route unavailable.</p>
        )}
      </div>

      {weatherSummary && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-slate-200 p-4">
          <span>🌤️</span>
          <p className="text-slate-600">{weatherSummary}</p>
          {usingMockWeather && <DemoBadge label="Estimated — connect WEATHER_API_KEY for real forecasts" />}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {days.map((day) => (
          <Link
            key={day.id}
            href={`/trips/${tripId}/day/${day.dayNumber}`}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-brand-blue-400 hover:text-brand-blue-700"
          >
            Day {day.dayNumber}
          </Link>
        ))}
        <Link
          href={`/trips/${tripId}/map`}
          className="rounded-full bg-brand-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-600"
        >
          View map
        </Link>
        <Link
          href={`/trips/${tripId}/live`}
          className="rounded-full bg-brand-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-600"
        >
          Start live trip
        </Link>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-center">
      <div className="text-xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
