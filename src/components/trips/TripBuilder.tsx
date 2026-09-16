"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** PRD Section 24 — "AI Trip Builder" progress screen. */
const STEPS = [
  "Understanding your preferences",
  "Finding destinations",
  "Checking opening hours",
  "Checking weather",
  "Calculating travel times",
  "Optimizing daily schedule",
];

export function TripBuilder({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [completedSteps, setCompletedSteps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const stepInterval = setInterval(() => {
      setCompletedSteps((n) => Math.min(n + 1, STEPS.length - 1));
    }, 900);

    fetch(`/api/trips/${tripId}/plan`, { method: "POST" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Trip planning failed.");
        return body;
      })
      .then(() => {
        clearInterval(stepInterval);
        setCompletedSteps(STEPS.length);
        setDone(true);
        setTimeout(() => router.push(`/trips/${tripId}`), 700);
      })
      .catch((err: Error) => {
        clearInterval(stepInterval);
        setError(err.message);
      });

    return () => clearInterval(stepInterval);
  }, [tripId, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold text-brand-blue-700">Planning your trip…</h1>

      <ul className="w-full max-w-sm space-y-3">
        {STEPS.map((step, i) => {
          const isComplete = i < completedSteps || done;
          return (
            <li key={step} className="flex items-center gap-3 text-sm">
              <span
                className={
                  isComplete
                    ? "flex h-5 w-5 items-center justify-center rounded-full bg-brand-green-500 text-white"
                    : "flex h-5 w-5 items-center justify-center rounded-full border border-slate-300"
                }
              >
                {isComplete ? "✓" : ""}
              </span>
              <span className={isComplete ? "text-slate-800" : "text-slate-400"}>{step}</span>
            </li>
          );
        })}
      </ul>

      {error && (
        <div className="max-w-sm rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {done && <p className="text-brand-green-700">Your itinerary is ready.</p>}
    </main>
  );
}
