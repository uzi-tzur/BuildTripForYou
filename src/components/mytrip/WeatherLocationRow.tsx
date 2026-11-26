"use client";

import { useState } from "react";
import type { WeatherPlace, WeatherPlaceSearchResponse } from "@/lib/weatherPlace";

/**
 * "📍 Weather for Tokyo, JP · Change" — the place a trip's forecast is shown
 * for. Picking one fills every day of the trip with that place's weather.
 * The search starts pre-filled with the trip's photo caption or name, so a
 * trip called "Tokyo" usually needs just one tap on the first result.
 */
export function WeatherLocationRow({
  place,
  suggestedQuery,
  onChange,
}: {
  place: WeatherPlace | null;
  suggestedQuery: string;
  onChange: (place: WeatherPlace) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WeatherPlace[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setError("Type a city or place name.");
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/mytrip-weather/places?q=${encodeURIComponent(trimmed)}`);
      const body = (await res.json().catch(() => null)) as WeatherPlaceSearchResponse | null;
      if (!body) setError("Couldn't look up that place — try again.");
      else if (!body.ok) setError(body.error.message);
      else {
        setResults(body.places);
        if (body.places.length === 0) setError(`No place called "${trimmed}" was found — try another spelling.`);
      }
    } catch {
      setError("Couldn't look up that place — check your connection and try again.");
    } finally {
      setSearching(false);
    }
  }

  function open() {
    const initial = place ? (place.name.split(",")[0] ?? place.name) : suggestedQuery;
    setQuery(initial);
    setResults(null);
    setError(null);
    setEditing(true);
    if (initial.trim().length >= 2) void search(initial);
  }

  if (!editing) {
    return (
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
        {place ? (
          <span>
            📍 Weather for <span className="font-semibold text-slate-700">{place.name}</span>
          </span>
        ) : (
          <span className="font-medium text-amber-700">📍 Add a weather location to see this trip&apos;s forecast</span>
        )}
        <button
          onClick={open}
          className={
            place
              ? "shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600 transition-colors hover:border-brand-blue-300 hover:text-brand-blue-700"
              : "shrink-0 rounded-full bg-brand-blue-500 px-3 py-1 font-semibold text-white shadow-sm transition-all hover:bg-brand-blue-600 active:scale-95"
          }
        >
          {place ? "Change" : "Add location"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs">
      <label className="block font-semibold text-slate-600" htmlFor="trip-weather-location">
        Weather location for this trip
      </label>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void search(query);
        }}
      >
        <input
          id="trip-weather-location"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="City, e.g. Tokyo"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-100"
        />
        <button
          type="submit"
          disabled={searching}
          className="shrink-0 rounded-full bg-brand-blue-500 px-4 py-1.5 font-semibold text-white shadow-sm transition-all hover:bg-brand-blue-600 active:scale-95 disabled:opacity-40"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </form>
      {error && <p className="text-rose-600">{error}</p>}
      {results && results.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {results.map((r) => (
            <li key={`${r.name}-${r.latitude}-${r.longitude}`}>
              <button
                onClick={() => {
                  onChange(r);
                  setEditing(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-brand-blue-50"
              >
                📍 {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-slate-500">Every day of the trip shows this place&apos;s forecast, starting about 5 days before that day.</p>
      <button
        onClick={() => setEditing(false)}
        className="rounded-full border border-slate-300 px-4 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-50"
      >
        Cancel
      </button>
    </div>
  );
}
