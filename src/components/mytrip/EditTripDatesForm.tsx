"use client";

import { useState, type FormEvent } from "react";
import { shiftDateOnly } from "@/lib/trips";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm transition-colors focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-100";

export function EditTripDatesForm({
  startDate,
  endDate,
  /** Non-null for a trip whose itinerary is a fixed-length plan — the end date follows the start date instead of being picked independently. */
  fixedDurationDays,
  onSave,
  onCancel,
}: {
  startDate: string;
  endDate: string;
  fixedDurationDays: number | null;
  onSave: (startDate: string, endDate: string) => void;
  onCancel: () => void;
}) {
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const computedEnd = fixedDurationDays != null ? shiftDateOnly(start, fixedDurationDays) : end;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSave(start, computedEnd);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-2.5 rounded-xl border border-dashed border-brand-blue-300 bg-brand-blue-50/50 p-3"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {fixedDurationDays != null ? "Move trip dates" : "Update trip dates"}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} required className={inputClass} />
        {fixedDurationDays != null ? (
          <input type="date" value={computedEnd} disabled className={`${inputClass} bg-slate-100 text-slate-500`} />
        ) : (
          <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} required className={inputClass} />
        )}
      </div>
      {fixedDurationDays != null && (
        <p className="text-xs text-slate-500">
          This trip&apos;s itinerary is a fixed {fixedDurationDays + 1}-day plan — the end date follows automatically.
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="rounded-full bg-brand-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-blue-600 active:scale-95"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
