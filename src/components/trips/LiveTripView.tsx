"use client";

import { useState } from "react";
import { RecommendationCard } from "./RecommendationCard";
import { BRAND } from "@/config/brand";
import type { Recommendation } from "@/lib/types";

export interface LiveTripActivitySummary {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
}

export function LiveTripView({
  tripId,
  currentActivity,
  nextActivity,
  initialRecommendations,
}: {
  tripId: string;
  currentActivity: LiveTripActivitySummary | null;
  nextActivity: LiveTripActivitySummary | null;
  initialRecommendations: Recommendation[];
}) {
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [checking, setChecking] = useState<"delay" | "weather" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runGuardianCheck(kind: "delay" | "weather") {
    setChecking(kind);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/guardian`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "delay" ? { simulatedDelayMinutes: 45 } : {}),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Trip Guardian check failed.");
      const fresh: Recommendation[] = body.recommendations;
      if (fresh.length === 0) {
        setError("Trip Guardian checked in — no issues detected right now.");
      } else {
        setRecommendations((prev) => [...fresh, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setChecking(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 p-5">
        <p className="text-xs uppercase tracking-wide text-slate-400">Now</p>
        <p className="text-lg font-semibold text-slate-900">{currentActivity?.title ?? "No current activity"}</p>

        {nextActivity && (
          <>
            <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">Next</p>
            <p className="font-medium text-slate-700">{nextActivity.title}</p>
          </>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 p-5">
        <p className="text-sm text-slate-500">
          No live GPS/traffic feed is connected — use these to simulate a Trip Guardian check
          (PRD Section 13/14) and see how {BRAND.name} responds.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => runGuardianCheck("delay")}
            disabled={checking !== null}
            className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
          >
            {checking === "delay" ? "Checking…" : "Simulate delay (+45 min)"}
          </button>
          <button
            onClick={() => runGuardianCheck("weather")}
            disabled={checking !== null}
            className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
          >
            {checking === "weather" ? "Checking…" : "Check weather now"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-slate-600">{error}</p>}
      </div>

      {recommendations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Trip Guardian recommendations</h2>
          {recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onResolved={(id) => setRecommendations((prev) => prev.filter((r) => r.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
