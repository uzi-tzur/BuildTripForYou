"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { formatWallClock } from "@/lib/flightImpact";
import type { FlightStatusResult } from "@/lib/providers/flights";

/** Live lookups are quota-limited, so an automatic (non-refresh-button) load reuses a recent result. */
const CACHE_TTL_MS = 15 * 60_000;

interface CachedStatus {
  at: number;
  status: FlightStatusResult;
  usingMock: boolean;
}

function cacheKey(flightNumber: string, date: string | null): string {
  return `mytrip-flight:${flightNumber}:${date ?? "any"}`;
}

function readCache(key: string): CachedStatus | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedStatus;
    return Date.now() - parsed.at < CACHE_TTL_MS ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: CachedStatus): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — the status still shows, it just isn't reused.
  }
}

function minutesBetween(later: string, earlier: string): number {
  return Math.round((Date.parse(`${later}:00Z`) - Date.parse(`${earlier}:00Z`)) / 60_000);
}

function delayOf(status: FlightStatusResult): number {
  if (status.departureDelayMinutes != null) return status.departureDelayMinutes;
  if (status.departureScheduled && status.departureEstimated) {
    return Math.max(0, minutesBetween(status.departureEstimated, status.departureScheduled));
  }
  return 0;
}

function StatusPill({ status, delay }: { status: FlightStatusResult["status"]; delay: number }) {
  if (status === "cancelled") return <span className="font-semibold text-red-600">🔴 Cancelled</span>;
  if (status === "diverted" || status === "incident") return <span className="font-semibold text-red-600">🔴 {status === "diverted" ? "Diverted" : "Incident"}</span>;
  if (status === "landed") return <span className="font-semibold text-brand-green-600">✅ Landed</span>;
  if (status === "active") return <span className="font-semibold text-brand-blue-600">🔵 In the air</span>;
  if (delay >= 15) return <span className="font-semibold text-amber-600">🟠 Delayed {delay} min</span>;
  if (status === "scheduled") return <span className="font-semibold text-brand-green-600">🟢 On time</span>;
  return <span className="font-semibold text-slate-500">Status unknown</span>;
}

export function FlightStatusPanel({
  flightNumber,
  airport,
  airline,
  arrivalAirport,
  departureIso,
  impact,
}: {
  flightNumber: string;
  airport: string | null;
  airline: string | null;
  arrivalAirport: string | null;
  /** The itinerary's scheduled departure (ISO with offset), so the lookup and result can be tied to the right day. */
  departureIso: string | null;
  /** Rendered under the status when the flight is late enough to matter; given the delay in minutes. */
  impact?: (delayMinutes: number) => ReactNode;
}) {
  const expectedDate = departureIso?.slice(0, 10) ?? null;
  const expectedTime = departureIso?.slice(11, 16) ?? null;

  const [status, setStatus] = useState<FlightStatusResult | null>(null);
  const [usingMock, setUsingMock] = useState(false);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (force: boolean) => {
      const key = cacheKey(flightNumber, expectedDate);
      if (!force) {
        const cached = readCache(key);
        if (cached) {
          setStatus(cached.status);
          setUsingMock(cached.usingMock);
          setCheckedAt(cached.at);
          setError(null);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/flight-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flightNumber, airport, airline, departureDate: expectedDate, departureTime: expectedTime }),
        });
        const body = (await res.json()) as { status?: FlightStatusResult | null; usingMockFlightStatus?: boolean };
        if (!body.status) {
          setStatus(null);
          setError("No status found for this flight number.");
          return;
        }
        const at = Date.now();
        setStatus(body.status);
        setUsingMock(Boolean(body.usingMockFlightStatus));
        setCheckedAt(at);
        writeCache(key, { at, status: body.status, usingMock: Boolean(body.usingMockFlightStatus) });
      } catch {
        setError("Couldn't check flight status — try again.");
      } finally {
        setLoading(false);
      }
    },
    [flightNumber, airport, airline, expectedDate, expectedTime],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const delay = status ? delayOf(status) : 0;
  const dateMismatch = status?.flightDate != null && expectedDate != null && status.flightDate !== expectedDate;
  const fromAirport = status?.departureAirport ?? airport;
  const toAirport = status?.arrivalAirport ?? arrivalAirport;

  return (
    <div className="mt-1.5 rounded-lg border border-sky-200 bg-sky-50/50 px-2.5 py-2 text-xs">
      {loading && !status && <p className="text-slate-500">Checking flight status…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {status && (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-slate-800">
              ✈️ {status.flightNumber}
              {fromAirport && toAirport ? ` · ${fromAirport} → ${toAirport}` : fromAirport ? ` · ${fromAirport}` : ""}
            </span>
            {usingMock && <DemoBadge label="Demo data" />}
          </div>
          <p>
            <StatusPill status={status.status} delay={delay} />
          </p>
          {(status.departureGate || status.departureTerminal) && (
            <p className="text-slate-600">
              {status.departureGate && `Gate: ${status.departureGate}`}
              {status.departureGate && status.departureTerminal ? " · " : ""}
              {status.departureTerminal && `Terminal: ${status.departureTerminal}`}
            </p>
          )}
          {status.departureScheduled && (
            <p className="text-slate-600">
              Scheduled: {formatWallClock(status.departureScheduled)}
              {status.departureEstimated && ` · Estimated: ${formatWallClock(status.departureEstimated)}`}
            </p>
          )}
          {dateMismatch && (
            <p className="rounded bg-amber-50 px-2 py-1 text-amber-800">
              This is the latest available flight ({status.flightDate}), not your {expectedDate} departure — live status
              for your date appears closer to the day.
            </p>
          )}
        </div>
      )}

      {status && !dateMismatch && status.status !== "cancelled" && impact?.(delay)}

      <div className="mt-1.5 flex items-center gap-2">
        <button
          onClick={() => void load(true)}
          disabled={loading}
          className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-sky-300 hover:text-sky-700 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "↻ Refresh Status"}
        </button>
        {checkedAt && <span className="text-[11px] text-slate-400">Checked {new Date(checkedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>}
      </div>
    </div>
  );
}
