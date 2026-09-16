"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TripView } from "@/components/mytrip/TripView";
import type { TripDay } from "@/data/coloradoTrip";
import { getTripDays, loadAllTrips, type TripMeta } from "@/lib/trips";
import type { WeatherCondition } from "@/lib/types";

export function TripPageClient({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<TripMeta | null | undefined>(undefined); // undefined = loading
  const [days, setDays] = useState<TripDay[]>([]);
  const [weatherByKey, setWeatherByKey] = useState<Record<string, WeatherCondition | null>>({});
  const [usingMockWeather, setUsingMockWeather] = useState(true);

  useEffect(() => {
    const found = loadAllTrips().find((t) => t.id === tripId) ?? null;
    setTrip(found);
    if (!found) return;

    const tripDays = getTripDays(found);
    setDays(tripDays);

    const locations = tripDays.flatMap((d) => d.weatherLocations.map((loc) => ({ date: d.date, ...loc })));
    if (locations.length === 0) return;

    fetch("/api/mytrip-weather", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations }),
    })
      .then((res) => res.json())
      .then((body) => {
        setWeatherByKey(body.weatherByKey ?? {});
        setUsingMockWeather(Boolean(body.usingMockWeather));
      })
      .catch(() => {
        // Weather is a nice-to-have here — the trip still renders without it.
      });
  }, [tripId]);

  if (trip === undefined) {
    return <main className="px-6 py-16 text-center text-slate-400">Loading…</main>;
  }

  if (trip === null) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-800">Trip not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          It may have been removed from this device, or you&apos;re on a different device/browser than where it
          was created.
        </p>
        <Link href="/my-trip" className="mt-4 inline-block text-brand-blue-600 underline">
          Back to all trips
        </Link>
      </main>
    );
  }

  return <TripView trip={trip} days={days} weatherByKey={weatherByKey} usingMockWeather={usingMockWeather} />;
}
