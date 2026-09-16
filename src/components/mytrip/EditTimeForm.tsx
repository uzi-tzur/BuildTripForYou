"use client";

import { useState, type FormEvent } from "react";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm transition-colors focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-100";

export function EditTimeForm({
  label,
  initialDate,
  initialTime,
  tripStartDate,
  tripEndDate,
  timezoneLabel,
  onSave,
  onCancel,
}: {
  label: string;
  initialDate: string;
  initialTime: string; // "" if not set
  tripStartDate: string;
  tripEndDate: string;
  timezoneLabel: string;
  onSave: (date: string, time: string) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSave(date, time);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2.5 space-y-2.5 rounded-xl border border-dashed border-brand-blue-300 bg-brand-blue-50/50 p-3"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Update {label} ({timezoneLabel})
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={date}
          min={tripStartDate}
          max={tripEndDate}
          onChange={(e) => setDate(e.target.value)}
          required
          className={inputClass}
        />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
      </div>
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
