"use client";

import { useState } from "react";
import type { Recommendation } from "@/lib/types";

/** PRD Section 31 — Change Approval screen. */
export function RecommendationCard({
  recommendation,
  onResolved,
}: {
  recommendation: Recommendation;
  onResolved: (id: string) => void;
}) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(decision: "approved" | "rejected") {
    setLoading(decision === "approved" ? "approve" : "reject");
    setError(null);
    try {
      const res = await fetch(`/api/trips/${recommendation.tripId}/recommendations/${recommendation.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not apply this change.");
      onResolved(recommendation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <h3 className="font-semibold text-amber-900">{recommendation.title}</h3>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-amber-800">
        {recommendation.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      {recommendation.impactSummary && (
        <p className="mt-2 text-sm text-amber-700">
          <strong>Impact:</strong> {recommendation.impactSummary}
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => resolve("approved")}
          disabled={loading !== null}
          className="rounded-full bg-brand-blue-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-blue-600 disabled:opacity-60"
        >
          {loading === "approve" ? "Applying…" : "Apply Update"}
        </button>
        <button
          onClick={() => resolve("rejected")}
          disabled={loading !== null}
          className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400 disabled:opacity-60"
        >
          {loading === "reject" ? "…" : "Keep Original Plan"}
        </button>
      </div>
    </div>
  );
}
