import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { destinationService } from "@/lib/services/destinationService";
import { getPlacesProvider } from "@/lib/providers/places";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/supabaseServerClient";

export default async function DestinationDetailsPage({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}) {
  const { destinationId } = await params;

  const destination = await (async () => {
    try {
      if (isSupabaseConfigured()) {
        const supabase = await getSupabaseServerClient();
        return await destinationService.getDestination(supabase, destinationId);
      }
      return await getPlacesProvider().getPlaceDetails({ placeId: destinationId });
    } catch {
      return null;
    }
  })();

  if (!destination) notFound();

  const isMock = destination.source === "mock";

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/explore" className="text-sm text-slate-500 hover:text-brand-blue-600">
        ← Back to Explore
      </Link>

      <div className="mt-4 flex h-56 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue-100 to-brand-green-100 text-6xl">
        {destination.imageUrl ? (
          <Image
            src={destination.imageUrl}
            alt={destination.name}
            width={800}
            height={450}
            className="h-56 w-full rounded-xl object-cover"
          />
        ) : (
          "🏞️"
        )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{destination.name}</h1>
        {isMock && <DemoBadge />}
      </div>

      <p className="mt-2 text-slate-600">{destination.description || "No description available."}</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <Field label="Rating" value={destination.rating !== null ? `⭐ ${destination.rating.toFixed(1)}` : "Unknown"} />
        <Field
          label="Price"
          value={destination.price === null ? "Unknown" : destination.price === 0 ? "Free" : `$${destination.price}`}
        />
        <Field label="Category" value={destination.category} />
        <Field label="Hours" value={destination.openingHours ?? "Unknown"} />
        <Field label="Phone" value={destination.phone ?? "Not available"} />
        <Field label="Reservation" value={destination.reservationRequired ? "Required" : "Not required"} />
        <Field
          label="Recommended visit"
          value={
            destination.recommendedDurationMinutes !== null
              ? `${Math.round(destination.recommendedDurationMinutes / 60)}h`
              : "Unknown"
          }
        />
        <Field label="Best time" value={destination.bestTimeToVisit ?? "Unknown"} />
        <Field label="Address" value={destination.address || "Unknown"} />
      </dl>

      <p className="mt-6 text-xs text-slate-400">
        Source: {destination.source}
        {destination.lastVerifiedAt && ` · Verified ${new Date(destination.lastVerifiedAt).toLocaleString()}`}
      </p>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
