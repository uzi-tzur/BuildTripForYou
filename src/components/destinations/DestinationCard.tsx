import Link from "next/link";
import { DemoBadge } from "@/components/ui/DemoBadge";
import type { Destination } from "@/lib/types";

/** PRD Section 9 — standardized Destination Card. */
export function DestinationCard({ destination }: { destination: Destination }) {
  const isMock = destination.source === "mock";

  return (
    <Link
      href={`/destinations/${destination.id}`}
      className="block overflow-hidden rounded-xl border border-slate-200 transition-shadow hover:shadow-md"
    >
      <div className="flex h-36 items-center justify-center bg-gradient-to-br from-brand-blue-100 to-brand-green-100 text-4xl">
        🏞️
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900">{destination.name}</h3>
          {isMock && <DemoBadge />}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
          {destination.rating !== null && <span>⭐ {destination.rating.toFixed(1)}</span>}
          {destination.price !== null && (
            <span>{destination.price === 0 ? "Free" : `$${destination.price}`}</span>
          )}
          {destination.recommendedDurationMinutes !== null && (
            <span>⏱ {Math.round(destination.recommendedDurationMinutes / 60)}h</span>
          )}
        </div>

        <p className="line-clamp-2 text-sm text-slate-500">{destination.description}</p>

        <div className="flex flex-wrap gap-x-3 text-xs text-slate-400">
          {destination.openingHours && <span>🕐 {destination.openingHours}</span>}
          <span>{destination.reservationRequired ? "Reservation required" : "No reservation needed"}</span>
        </div>
      </div>
    </Link>
  );
}
