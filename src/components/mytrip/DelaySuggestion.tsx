"use client";

import { useState } from "react";
import { formatWallClock, type ProposedChange } from "@/lib/flightImpact";

/**
 * "X is delayed by N minutes — these planned activities may be affected,
 * move each back?" with Accept / Keep. Used for a late flight and for an
 * activity the user moved to a later time. Nothing in the itinerary changes
 * until the user accepts.
 */
export function DelaySuggestion({
  label,
  delayMinutes,
  changes,
  emptyText,
  onAccept,
}: {
  label: string;
  delayMinutes: number;
  changes: ProposedChange[];
  /** Shown instead of the suggestion when nothing is affected; omit to show nothing at all. */
  emptyText?: string;
  onAccept: (changes: ProposedChange[]) => void;
}) {
  const [decision, setDecision] = useState<"accepted" | "kept" | null>(null);

  if (decision === "accepted") {
    return <p className="mt-1.5 rounded-lg bg-brand-green-50 px-2.5 py-1.5 text-xs text-brand-green-800">✅ Itinerary updated for the delay.</p>;
  }
  if (decision === "kept") {
    return <p className="mt-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600">Keeping your current itinerary.</p>;
  }
  if (changes.length === 0 && !emptyText) return null;

  return (
    <div className="mt-1.5 space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
      <p className="font-semibold">
        ⚠️ {label} is delayed by {delayMinutes} minutes.
      </p>
      {changes.length === 0 ? (
        <p>{emptyText}</p>
      ) : (
        <>
          <p>
            {changes.length === 1 ? "Your planned activity" : "These planned activities"} may be affected. Suggested change — move{" "}
            {changes.length === 1 ? "it" : "each"} back by {delayMinutes} minutes:
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
