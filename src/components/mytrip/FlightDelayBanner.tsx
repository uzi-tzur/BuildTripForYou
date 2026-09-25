"use client";

import { useState } from "react";
import { IMPACT_THRESHOLD_MINUTES, formatWallClock, type Disruption, type ProposedChange } from "@/lib/flightImpact";

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
  const [decision, setDecision] = useState<"accepted" | "kept" | null>(null);

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

  if (decision === "accepted") {
    return <p className="mt-1.5 rounded-lg bg-brand-green-50 px-2.5 py-1.5 text-brand-green-800">✅ Itinerary updated for the delay.</p>;
  }
  if (decision === "kept") {
    return <p className="mt-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-600">Keeping your current itinerary.</p>;
  }

  return (
    <div className="mt-1.5 space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-900">
      <p className="font-semibold">
        ⚠️ {flightLabel} is delayed by {disruption.delayMinutes} minutes.
      </p>
      {changes.length === 0 ? (
        <p>None of your planned activities around your arrival look affected.</p>
      ) : (
        <>
          <p>
            {changes.length === 1 ? "Your planned activity" : "These planned activities"} may be affected. Suggested change — move{" "}
            {changes.length === 1 ? "it" : "each"} back by {disruption.delayMinutes} minutes:
          </p>
          <ul className="space-y-0.5">
            {changes.map((c) => (
              <li key={c.id}>
                {c.title}: {formatWallClock(c.oldTime)} → <span className="font-semibold">{formatWallClock(c.newTime)}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 pt-0.5">
            <button
              onClick={() => {
                onAccept(changes);
                setDecision("accepted");
              }}
              className="rounded-full bg-amber-500 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition-all hover:bg-amber-600 active:scale-95"
            >
              Accept Change
            </button>
            <button
              onClick={() => setDecision("kept")}
              className="rounded-full border border-amber-300 bg-white px-3 py-1 text-[11px] font-semibold text-amber-800 transition-colors hover:bg-amber-100"
            >
              Keep Current Itinerary
            </button>
          </div>
        </>
      )}
    </div>
  );
}
