"use client";

import { useEffect, useState } from "react";
import { DemoBadge } from "@/components/ui/DemoBadge";
import type { FlightStatusResult } from "@/lib/providers/flights";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  active: "In the air",
  landed: "Landed",
  cancelled: "Cancelled",
  diverted: "Diverted",
  incident: "Incident",
  unknown: "Unknown",
};

const STATUS_COLOR: Record<string, string> = {
  scheduled: "text-slate-700",
  active: "text-brand-blue-600",
  landed: "text-brand-green-600",
  cancelled: "text-red-600",
  diverted: "text-amber-600",
  incident: "text-red-600",
  unknown: "text-slate-500",
};

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function FlightStatusPanel({
  flightNumber,
  airport,
  airline,
}: {
  flightNumber: string;
  airport: string | null;
  airline: string | null;
}) {
  const [status, setStatus] = useState<FlightStatusResult | null>(null);
  const [usingMock, setUsingMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/flight-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flightNumber, airport, airline }),
    })
      .then((res) => res.json())
      .then((body: { status?: FlightStatusResult | null; usingMockFlightStatus?: boolean }) => {
        if (cancelled) return;
        setStatus(body.status ?? null);
        setUsingMock(Boolean(body.usingMockFlightStatus));
        if (!body.status) setError("No status found for this flight number.");
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't check flight status — try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [flightNumber, airport, airline]);

  return (
    <div className="mt-1.5 rounded-lg border border-sky-200 bg-sky-50/50 px-2.5 py-2 text-xs">
      {loading && <p className="text-slate-500">Checking flight status…</p>}
      {!loading && error && <p className="text-red-600">{error}</p>}
      {!loading && status && (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`font-semibold ${STATUS_COLOR[status.status] ?? "text-slate-600"}`}>
              ✈️ {status.flightNumber} — {STATUS_LABEL[status.status] ?? status.status}
            </span>
            {usingMock && <DemoBadge label="Demo data" />}
          </div>
          {(status.departureScheduled || status.departureEstimated) && (
            <p className="text-slate-600">
              Departure{status.departureAirport ? ` (${status.departureAirport})` : ""}: {formatTime(status.departureScheduled)}
              {status.departureEstimated &&
                status.departureEstimated !== status.departureScheduled &&
                ` · Est. ${formatTime(status.departureEstimated)}`}
            </p>
          )}
          {(status.departureGate || status.departureTerminal) && (
            <p className="text-slate-600">
              {status.departureTerminal && `Terminal ${status.departureTerminal}`}
              {status.departureTerminal && status.departureGate ? " · " : ""}
              {status.departureGate && `Gate ${status.departureGate}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
