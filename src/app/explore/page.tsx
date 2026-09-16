import Image from "next/image";
import Link from "next/link";
import { ComparisonTable } from "@/components/destinations/ComparisonTable";
import { DestinationCard } from "@/components/destinations/DestinationCard";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { BRAND } from "@/config/brand";
import { destinationService } from "@/lib/services/destinationService";
import { getPlacesProvider } from "@/lib/providers/places";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/supabaseServerClient";
import type { Destination } from "@/lib/types";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || "Denver, CO attractions";

  let destinations: Destination[];
  if (isSupabaseConfigured()) {
    const supabase = await getSupabaseServerClient();
    destinations = await destinationService.searchDestinations(supabase, query);
  } else {
    // No DB yet — show live/mock provider results uncached.
    destinations = await getPlacesProvider().searchPlaces({ query });
  }

  const usingMock = !process.env.GOOGLE_MAPS_API_KEY;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/" className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-blue-600">
        <Image src="/logo.png" alt="" width={36} height={36} className="rounded-md" />
        {BRAND.name}
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-brand-blue-700">Explore Destinations</h1>
      <p className="mt-1 flex items-center gap-2 text-slate-600">
        Destination Intelligence (PRD §5.2) — search, compare, and decide what to visit.
        {usingMock && <DemoBadge label="Demo data — connect GOOGLE_MAPS_API_KEY for real results" />}
      </p>

      <form className="mt-6 flex gap-2" action="/explore">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search a city, park, or interest (e.g. 'Denver hiking')"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-brand-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-600"
        >
          Search
        </button>
      </form>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {destinations.map((destination) => (
          <DestinationCard key={destination.id} destination={destination} />
        ))}
      </div>

      {destinations.length > 1 && (
        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Compare</h2>
          <ComparisonTable destinations={destinations.slice(0, 4)} />
        </div>
      )}
    </main>
  );
}
