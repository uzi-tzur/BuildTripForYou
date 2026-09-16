import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfigWarning } from "@/components/ui/ConfigWarning";
import { getSupabaseServerClient } from "@/lib/db/supabaseServerClient";
import { destinationService } from "@/lib/services/destinationService";
import { tripService } from "@/lib/services/tripService";
import type { Activity, Destination } from "@/lib/types";

/** PRD Section 29 — Map screen. */
export default async function TripMapPage({ params }: { params: Promise<{ tripId: string }> }) {
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
  const activitiesWithDestinations = activitiesByDay
    .flat()
    .filter((a): a is Activity & { destinationId: string } => a.destinationId !== null);

  const destinations = await Promise.all(
    activitiesWithDestinations.map((a) => destinationService.getDestination(supabase, a.destinationId)),
  );
  const stops: { activity: Activity; destination: Destination }[] = activitiesWithDestinations.map((a, i) => ({
    activity: a,
    destination: destinations[i]!,
  }));

  const embedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href={`/trips/${tripId}`} className="text-sm text-slate-500 hover:text-brand-blue-600">
        ← Back to trip
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-brand-blue-700">Trip Map</h1>

      {embedKey && stops.length >= 1 ? (
        <iframe
          title="Trip route map"
          className="mt-4 h-[420px] w-full rounded-xl border border-slate-200"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={buildEmbedUrl(embedKey, trip.origin, trip.destination, stops)}
        />
      ) : (
        <div className="mt-4 space-y-3">
          <ConfigWarning>
            No <code>NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY</code> configured — showing the route as a stop list
            instead of an interactive map. Add the key (see README) to get a real map here.
          </ConfigWarning>
          <ol className="space-y-2 rounded-xl border border-slate-200 p-4">
            <li className="text-sm text-slate-600">📍 Start: {trip.origin}</li>
            {stops.map(({ activity, destination }, i) => (
              <li key={activity.id} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue-100 text-xs font-semibold text-brand-blue-700">
                  {i + 1}
                </span>
                {destination.name}
                <span className="text-slate-400">({destination.address || "address unknown"})</span>
              </li>
            ))}
            <li className="text-sm text-slate-600">🏁 End: {trip.destination}</li>
          </ol>
        </div>
      )}
    </main>
  );
}

function buildEmbedUrl(
  key: string,
  origin: string,
  destination: string,
  stops: { destination: Destination }[],
): string {
  const params = new URLSearchParams({ key, origin, destination });
  const waypoints = stops.map((s) => s.destination.address || s.destination.name).slice(0, 8);
  if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));
  return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
}
