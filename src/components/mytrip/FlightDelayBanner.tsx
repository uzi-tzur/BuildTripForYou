"use client";

import { useState } from "react";
import { IMPACT_THRESHOLD_MINUTES, formatWallClock, type ProposedChange } from "@/lib/flightImpact";

/** Shown under a delayed flight's status: what the delay does to the plan, and a one-tap way to accept or ignore the fix. */
export function FlightDelayBanner({
  flightNumber,
  delayMinutes,
  changes,
  onAccept,
}: {
  flightNumber: string;
  delayMinutes: number;
  changes: ProposedChange[];
  onAccept: (changes: ProposedChange[]) => void;
}) {
  const [decision, setDecision] = useState<"accepted" | "kept" | null>(null);

  if (delayMinutes < IMPACT_THRESHOLD_MINUTES) return null;

  if (decision === "accepted") {
    return <p className="mt-1.5 rounded-lg bg-brand-green-50 px-2.5 py-1.5 text-brand-green-800">✅ Itinerary updated for the delay.</p>;
  }
  if (decision === "kept") {
    return <p className="mt-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-600">Keeping your itinerary as planned.</p>;
  }

  return (
    <div className="mt-1.5 space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-900">
      <p className="font-semibold">
        ⚠️ Flight {flightNumber} is delayed by {delayMinutes} minutes.
      </p>
      {changes.length === 0 ? (
        <p>None of your planned activities before landing are affected.</p>
      ) : (
        <>
          <p>These activities would now start before you land:</p>
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
              Keep My Itinerary
            </button>
          </div>
        </>
      )}
    </div>
  );
}
