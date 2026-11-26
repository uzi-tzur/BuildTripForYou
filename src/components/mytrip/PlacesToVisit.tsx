"use client";

import { useState, type FormEvent } from "react";
import { Chevron } from "@/components/ui/Chevron";
import { generatePlaceId, MAX_PLACE_NAME, MAX_PLACES, type PlaceToVisit } from "@/lib/tripPlaces";

/**
 * "📍 Places to visit" at the top of the trip: the cities/areas the trip
 * should cover, added one by one so none is forgotten while planning, and
 * ticked off once each is planned. Names can be in any language — each
 * line picks its own text direction (Hebrew reads right-to-left).
 */
export function PlacesToVisit({ places, onChange }: { places: PlaceToVisit[]; onChange: (places: PlaceToVisit[]) => void }) {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState("");
  const doneCount = places.filter((p) => p.done).length;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || places.length >= MAX_PLACES) return;
    onChange([...places, { id: generatePlaceId(), name: trimmed, done: false }]);
    setName("");
  }

  function move(index: number, by: -1 | 1) {
    const target = index + by;
    if (target < 0 || target >= places.length) return;
    const next = [...places];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <div className="min-w-0">
          <p className="font-bold text-slate-900">📍 Places to visit</p>
          <p className="truncate text-xs text-slate-500" dir="auto">
            {places.length === 0
              ? "Add the places this trip should cover, one by one"
              : `${places.map((p) => p.name).join(" · ")} — ${doneCount} of ${places.length} planned`}
          </p>
        </div>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-2">
          {places.length > 0 && (
            <ol className="divide-y divide-slate-100">
              {places.map((place, index) => (
                <li key={place.id} className="flex items-center gap-2.5 py-1.5">
                  <input
                    type="checkbox"
                    checked={place.done}
                    onChange={() => onChange(places.map((p) => (p.id === place.id ? { ...p, done: !p.done } : p)))}
                    className="h-5 w-5 shrink-0 accent-brand-green-500"
                    aria-label={`${place.name} planned`}
                  />
                  <span className="w-5 shrink-0 text-xs font-semibold text-slate-400">{index + 1}.</span>
                  <span
                    dir="auto"
                    className={`min-w-0 flex-1 break-words text-sm ${place.done ? "text-slate-400 line-through" : "font-medium text-slate-800"}`}
                  >
                    {place.name}
                  </span>
                  <button
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${place.name} up`}
                    className="shrink-0 rounded-full px-1.5 text-sm text-slate-300 transition-colors hover:text-brand-blue-600 disabled:invisible"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(index, 1)}
                    disabled={index === places.length - 1}
                    aria-label={`Move ${place.name} down`}
                    className="shrink-0 rounded-full px-1.5 text-sm text-slate-300 transition-colors hover:text-brand-blue-600 disabled:invisible"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => onChange(places.filter((p) => p.id !== place.id))}
                    aria-label={`Remove ${place.name}`}
                    className="shrink-0 rounded-full px-2 py-0.5 text-lg leading-none text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
          )}
          <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kyoto"
              dir="auto"
              maxLength={MAX_PLACE_NAME}
              aria-label="Add a place to visit"
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm transition-colors focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-100"
            />
            <button
              type="submit"
              disabled={!name.trim() || places.length >= MAX_PLACES}
              className="shrink-0 rounded-lg bg-brand-blue-500 px-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-blue-600 active:scale-95 disabled:opacity-40"
            >
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
