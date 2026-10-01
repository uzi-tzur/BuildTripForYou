"use client";

import { useState } from "react";
import { TRIP_TIME_ZONES, tripTimeZoneFields } from "@/lib/timeZones";

/**
 * "🕒 Times are in Central time · Change" — the trip's time zone, which the
 * times the user enters are in. Changing it keeps every entered time's
 * digits ("10:53 PM") and reads them in the new zone.
 */
export function TripTimeZoneRow({
  timezoneLabel,
  timezoneOffset,
  startDate,
  onChange,
}: {
  timezoneLabel: string;
  timezoneOffset: string;
  startDate: string;
  onChange: (timezoneOffset: string, timezoneLabel: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const current = TRIP_TIME_ZONES.find((z) => z.label === timezoneLabel);
  const [choice, setChoice] = useState(current?.id ?? "");

  if (!editing) {
    return (
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          🕒 Times are in <span className="font-semibold text-slate-700">{timezoneLabel}</span>{" "}
          <span className="text-slate-400">(UTC{timezoneOffset})</span>
        </span>
        <button
          onClick={() => {
            setChoice(current?.id ?? "");
            setEditing(true);
          }}
          className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600 transition-colors hover:border-brand-blue-300 hover:text-brand-blue-700"
        >
          Change
        </button>
      </div>
    );
  }

  const chosen = TRIP_TIME_ZONES.find((z) => z.id === choice);
  return (
    <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs">
      <label className="block font-semibold text-slate-600" htmlFor="trip-time-zone">
        Time zone for this trip
      </label>
      <select
        id="trip-time-zone"
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-100"
      >
        {!current && <option value="">{timezoneLabel} (current)</option>}
        {TRIP_TIME_ZONES.map((z) => (
          <option key={z.id} value={z.id}>
            {z.label}
          </option>
        ))}
      </select>
      <p className="text-slate-500">Activity times you entered keep their digits (10:53 PM stays 10:53 PM) and are read in the new time zone.</p>
      <div className="flex gap-2">
        <button
          disabled={!chosen}
          onClick={() => {
            if (!chosen) return;
            const fields = tripTimeZoneFields(chosen, startDate);
            onChange(fields.timezoneOffset, fields.timezoneLabel);
            setEditing(false);
          }}
          className="rounded-full bg-brand-blue-500 px-4 py-1.5 font-semibold text-white shadow-sm transition-all hover:bg-brand-blue-600 active:scale-95 disabled:opacity-40"
        >
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-full border border-slate-300 px-4 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
