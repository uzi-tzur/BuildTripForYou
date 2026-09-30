"use client";

import { useEffect, useState } from "react";
import { formatDuration, formatMiles, type DriveTimeApiResponse } from "@/lib/driveTime";

/** Lookups are billed per call, so a drive time is reused for a while — traffic doesn't change that fast. */
const CACHE_TTL_MS = 15 * 60_000;

function cacheKey(origin: string, destination: string): string {
  return `mytrip-drive-v1:${origin}|${destination}`;
}

function readCache(key: string): DriveTimeApiResponse | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; response: DriveTimeApiResponse };
    return Date.now() - parsed.at < CACHE_TTL_MS ? parsed.response : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, response: DriveTimeApiResponse): void {
  try {
    window.localStorage.setItem(key, JSON.stringify({ at: Date.now(), response }));
  } catch {
    // Storage unavailable — the drive time still shows, it just isn't reused.
  }
}

/** "🚗 35 min drive · 22 mi" from one stop's address to the next, with current traffic. Renders nothing when there's no real answer. */
export function DriveTime({ origin, destination }: { origin: string; destination: string }) {
  const [response, setResponse] = useState<DriveTimeApiResponse | null>(null);

  useEffect(() => {
    const key = cacheKey(origin, destination);
    const cached = readCache(key);
    if (cached) {
      setResponse(cached);
      return;
    }
    setResponse(null);
    let cancelled = false;
    fetch("/api/drive-time", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination }),
    })
      .then((res) => res.json() as Promise<DriveTimeApiResponse>)
      .then((body) => {
        if (cancelled) return;
        setResponse(body);
        if (body.ok || body.error.code === "not_configured") writeCache(key, body);
      })
      .catch(() => {
        if (!cancelled) setResponse({ ok: false, error: { code: "unavailable", message: "" } });
      });
    return () => {
      cancelled = true;
    };
  }, [origin, destination]);

  if (!response) return <p className="pl-[2.875rem] text-xs text-slate-500">🚗 Checking drive time…</p>;
  if (!response.ok) {
    return response.error.code === "not_configured" ? null : (
      <p className="pl-[2.875rem] text-xs text-slate-500">🚗 Drive time unavailable right now</p>
    );
  }
  return (
    <p className="pl-[2.875rem] text-sm text-slate-700">
      🚗 <span className="font-semibold text-slate-900">{formatDuration(response.durationSeconds)} drive</span>
      <span className="text-slate-500"> · {formatMiles(response.distanceMeters)} · with current traffic</span>
    </p>
  );
}
