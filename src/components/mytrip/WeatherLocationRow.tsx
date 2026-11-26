"use client";

import { useEffect, useState } from "react";
import type { WeatherPlace, WeatherPlaceSearchResponse } from "@/lib/weatherPlace";

/**
 * "📍 Weather for Tokyo, JP · Change" — the trip-wide place its forecast is
 * shown for. Picking one fills every day of the trip with that place's
 * weather, except days given their own place (see DayWeatherControl). The
 * search starts pre-filled with the trip's photo caption or name, so a trip
 * called "Tokyo" usually needs just one tap on the first result.
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

  if (editing) {
    return (
      <WeatherPlacePicker
        heading="Weather location for this trip"
        initialQuery={place ? shortName(place) : suggestedQuery}
        hint="Every day shows this place's forecast (unless you give a day its own place), starting about 5 days before that day."
        onPick={(p) => {
          onChange(p);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

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
        onClick={() => setEditing(true)}
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

/**
 * The "📍 Change place" button under a day's weather, for a trip that moves
 * (e.g. a round trip): that day shows its own place instead of the
 * trip-wide one, until reset.
 */
export function DayWeatherControl({
  dayPlace,
  tripPlace,
  onChange,
}: {
  /** This day's own place, or null when it follows the trip-wide one. */
  dayPlace: WeatherPlace | null;
  tripPlace: WeatherPlace | null;
  onChange: (place: WeatherPlace | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const shown = dayPlace ?? tripPlace;

  if (editing) {
    return (
      <div className="px-4 pb-4">
        <WeatherPlacePicker
          heading="Weather location for this day"
          initialQuery={shown ? shortName(shown) : ""}
          hint="Only this day changes — the rest of the trip keeps its own place."
          onPick={(p) => {
            onChange(p);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
          resetLabel={dayPlace && tripPlace ? `Use the trip's place (${tripPlace.name})` : dayPlace ? "Remove this day's place" : undefined}
          onReset={
            dayPlace
              ? () => {
                  onChange(null);
                  setEditing(false);
                }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="-mt-2 px-4 pb-3">
      <button
        onClick={() => setEditing(true)}
        className="rounded-full px-1 text-[11px] font-semibold text-slate-400 transition-colors hover:text-brand-blue-600"
      >
        📍 {shown ? "Change this day's weather place" : "Add a weather place for this day"}
      </button>
    </div>
  );
}

function shortName(place: WeatherPlace): string {
  return place.name.split(",")[0] ?? place.name;
}

/** Search box + results list: type a city, tap the right match. Searches right away when it opens with a name in it. */
function WeatherPlacePicker({
  heading,
  initialQuery,
  hint,
  onPick,
  onCancel,
  resetLabel,
  onReset,
}: {
  heading: string;
  initialQuery: string;
  hint: string;
  onPick: (place: WeatherPlace) => void;
  onCancel: () => void;
  resetLabel?: string;
  onReset?: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
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

  useEffect(() => {
    if (initialQuery.trim().length >= 2) void search(initialQuery);
    // Only the name it opened with — later searches come from the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs">
      <p className="font-semibold text-slate-600">{heading}</p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void search(query);
        }}
      >
        <input
          aria-label={heading}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="City, e.g. Kyoto"
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
                onClick={() => onPick(r)}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-brand-blue-50"
              >
                📍 {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-slate-500">{hint}</p>
      <div className="flex flex-wrap gap-2">
        {onReset && resetLabel && (
          <button
            onClick={onReset}
            className="rounded-full border border-brand-blue-200 px-4 py-1.5 font-semibold text-brand-blue-700 transition-colors hover:bg-brand-blue-50"
          >
            {resetLabel}
          </button>
        )}
        <button
          onClick={onCancel}
          className="rounded-full border border-slate-300 px-4 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
