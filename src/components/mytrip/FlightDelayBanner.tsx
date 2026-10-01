"use client";

import { DelaySuggestion } from "@/components/mytrip/DelaySuggestion";
import { IMPACT_THRESHOLD_MINUTES, type Disruption, type ProposedChange } from "@/lib/flightImpact";

/**
 * Shown under a disrupted flight's status: what the disruption does to the
 * plan, and a suggested fix the user must explicitly accept. Nothing about
 * the itinerary changes until they do.
 */
export function FlightDelayBanner({
  flightLabel,
  disruption,
  changes,
  onAccept,
}: {
  flightLabel: string;
  disruption: Disruption;
  changes: ProposedChange[];
  onAccept: (changes: ProposedChange[]) => void;
}) {
  if (disruption.kind === "none") return null;

  if (disruption.kind === "cancelled" || disruption.kind === "diverted") {
    return (
      <div className="mt-1.5 space-y-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-red-900">
        <p className="font-semibold">
          ⚠️ Flight {flightLabel} is {disruption.kind === "cancelled" ? "cancelled" : "diverted"}.
        </p>
        <p>
          Contact the airline to rebook. Once you have a new flight, update it and review the activities planned around your arrival — nothing in
          your itinerary has been changed.
        </p>
      </div>
    );
  }

  if (disruption.delayMinutes < IMPACT_THRESHOLD_MINUTES) return null;

  return (
    <DelaySuggestion
      label={flightLabel}
      delayMinutes={disruption.delayMinutes}
      changes={changes}
      emptyText="None of your planned activities around your arrival look affected."
      onAccept={onAccept}
    />
  );
}
