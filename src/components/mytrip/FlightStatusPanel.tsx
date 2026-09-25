"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { assessDisruption, formatWallClock, type Disruption } from "@/lib/flightImpact";
import { flightLabel, flightLookupCode, flightRoute, type Flight } from "@/lib/flights";
import type {
  FlightLegStatus,
  FlightLookupErrorCode,
  FlightStatusApiResponse,
  FlightStatusResult,
} from "@/lib/providers/flights";

/** Live lookups are quota-limited, so a result — or a definitive "no" — is reused for a while unless the user hits Refresh. */
const CACHE_TTL_MS = 15 * 60_000;
/** Transient failures aren't remembered: retrying them is the point. */
const CACHEABLE_ERRORS: FlightLookupErrorCode[] = ["flight_not_found", "not_yet_available", "ambiguous_flight", "no_live_status", "rate_limited"];
/** Bumped when the stored shape changes, so old entries are ignored instead of misread. */
const CACHE_VERSION = "v2";

interface CachedResponse {
  at: number;
  response: FlightStatusApiResponse;
}

function cacheKey(code: string, date: string): string {
  return `mytrip-flight-${CACHE_VERSION}:${code}:${date}`;
}

function readCache(key: string): CachedResponse | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedResponse;
    return Date.now() - parsed.at < CACHE_TTL_MS ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: CachedResponse): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — the status still shows, it just isn't reused.
  }
}

function StatusPill({ status, disruption }: { status: FlightStatusResult["status"]; disruption: Disruption }) {
  if (status === "cancelled") return <span className="font-semibold text-red-600">🔴 Cancelled</span>;
  if (status === "diverted") return <span className="font-semibold text-red-600">🔴 Diverted</span>;
  if (status === "incident") return <span className="font-semibold text-red-600">🔴 Irregular operation</span>;
  if (status === "landed") return <span className="font-semibold text-brand-green-600">✅ Landed</span>;
  if (status === "departed") return <span className="font-semibold text-brand-blue-600">🔵 Departed</span>;
  if (status === "scheduled") {
    return disruption.kind === "delay" ? (
      <span className="font-semibold text-amber-600">🟠 Delayed {disruption.delayMinutes} min</span>
    ) : (
      <span className="font-semibold text-brand-green-600">🟢 On Time</span>
    );
  }
  return <span className="font-semibold text-slate-500">Status not reported</span>;
}

function LegDetails({ title, leg }: { title: string; leg: FlightLegStatus }) {
  const place = [leg.airport, leg.terminal && `Terminal ${leg.terminal}`, leg.gate && `Gate ${leg.gate}`].filter(Boolean).join(" · ");
  const times = [
    leg.scheduled && `Scheduled ${formatWallClock(leg.scheduled)}`,
    leg.estimated && `Estimated ${formatWallClock(leg.estimated)}`,
    leg.actual && `Actual ${formatWallClock(leg.actual)}`,
  ].filter(Boolean);
  if (!place && times.length === 0) return null;
  return (
    <div>
      <p className="font-semibold text-slate-700">
        {title}
        {place && <span className="font-normal text-slate-600"> — {place}</span>}
      </p>
      {times.length > 0 && <p className="text-slate-600">{times.join(" · ")}</p>}
    </div>
  );
}

const INFO_ONLY_ERRORS: FlightLookupErrorCode[] = ["not_yet_available", "no_live_status", "flight_not_found", "ambiguous_flight"];

export function FlightStatusPanel({
  flight,
  impact,
}: {
  flight: Flight;
  /** Rendered under the status when the flight is disrupted; given the assessment. */
  impact?: (disruption: Disruption) => ReactNode;
}) {
  const code = flightLookupCode(flight);
  const { flightDate, departureAirport, arrivalAirport } = flight;

  const [response, setResponse] = useState<FlightStatusApiResponse | null>(null);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(code !== null);

  const load = useCallback(
    async (force: boolean) => {
      if (!code) return;
      const key = cacheKey(code, flightDate);
      if (!force) {
        const cached = readCache(key);
        if (cached) {
          setResponse(cached.response);
          setCheckedAt(cached.at);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      try {
        const res = await fetch("/api/flight-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flightNumber: code, flightDate, departureAirport, arrivalAirport }),
        });
        const body = (await res.json()) as FlightStatusApiResponse;
        const at = Date.now();
        setResponse(body);
        setCheckedAt(at);
        if (body.ok || CACHEABLE_ERRORS.includes(body.error.code)) writeCache(key, { at, response: body });
      } catch {
        setResponse({ ok: false, error: { code: "provider_unavailable", message: "Couldn't reach the server — check your connection and try again." } });
      } finally {
        setLoading(false);
      }
    },
    [code, flightDate, departureAirport, arrivalAirport],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const status = response?.ok ? response.status : null;
  const disruption = status ? assessDisruption(status) : ({ kind: "none" } as Disruption);
  const departureDelay = status?.departure.delayMinutes ?? 0;
  const arrivalDelay = status?.arrival.delayMinutes ?? 0;

  return (
    <div className="mt-1.5 rounded-lg border border-sky-200 bg-sky-50/50 px-2.5 py-2 text-xs">
      <p className="font-semibold text-slate-800">
        ✈️ {flightLabel(flight)}
        {flightRoute(flight) && <span className="font-normal text-slate-600"> · {flightRoute(flight)}</span>}
      </p>

      {!code && (
        <p className="mt-1 text-amber-700">
          This flight needs its airline code to be looked up — edit the flight number to include it (for example AA1523).
        </p>
      )}
      {code && loading && !response && <p className="mt-1 text-slate-500">Checking flight status…</p>}

      {response && !response.ok && (
        <p className={`mt-1 ${INFO_ONLY_ERRORS.includes(response.error.code) ? "text-slate-600" : "text-red-600"}`}>
          {response.error.message}
        </p>
      )}

      {status && (
        <div className="mt-1 space-y-1.5">
          <p>
            <StatusPill status={status.status} disruption={disruption} />
          </p>
          <LegDetails title="Departure" leg={status.departure} />
          <LegDetails title="Arrival" leg={status.arrival} />
          {(departureDelay > 0 || arrivalDelay > 0) && (
            <p className="text-amber-700">
              Delay:{" "}
              {[departureDelay > 0 && `departure +${departureDelay} min`, arrivalDelay > 0 && `arrival +${arrivalDelay} min`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      )}

      {status && disruption.kind !== "none" && impact?.(disruption)}

      {code && (
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => void load(true)}
            disabled={loading}
            className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-sky-300 hover:text-sky-700 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "↻ Refresh Status"}
          </button>
          {checkedAt && (
            <span className="text-[11px] text-slate-400">
              Checked {new Date(checkedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
