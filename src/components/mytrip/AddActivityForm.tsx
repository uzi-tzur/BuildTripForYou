"use client";

import { useState, type FormEvent } from "react";
import {
  CUSTOM_STOP_CATEGORIES,
  CUSTOM_STOP_CATEGORY_ICON,
  CUSTOM_STOP_CATEGORY_LABEL,
  generateStopId,
  type CustomStop,
  type CustomStopCategory,
} from "@/lib/customStops";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm transition-colors focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-100";
const labelClass = "block text-[11px] font-semibold uppercase tracking-wide text-slate-400";

export function AddActivityForm({
  date,
  tripStartDate,
  tripEndDate,
  timezoneLabel,
  onAdd,
  onCancel,
}: {
  date: string;
  tripStartDate: string;
  tripEndDate: string;
  timezoneLabel: string;
  onAdd: (stop: CustomStop) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState<CustomStopCategory>("attraction");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(date);
  const [time, setTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter what this activity is.");
      return;
    }
    if (endDate && endDate < startDate) {
      setError("End date can't be before the start date.");
      return;
    }

    try {
      onAdd({
        id: generateStopId(),
        date: startDate,
        time: time || null,
        endDate: endDate || null,
        endTime: endTime || null,
        category,
        title: title.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add this activity — please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5 rounded-xl border border-dashed border-brand-blue-300 bg-brand-blue-50/50 p-3.5">
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as CustomStopCategory)}
        className={inputClass}
      >
        {CUSTOM_STOP_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {CUSTOM_STOP_CATEGORY_ICON[c]} {CUSTOM_STOP_CATEGORY_LABEL[c]}
          </option>
        ))}
      </select>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What is it? (required)"
        required
        className={inputClass}
      />

      <div>
        <p className={labelClass}>Starts</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={startDate}
            min={tripStartDate}
            max={tripEndDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
            required
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputClass}
            title={`Time is in ${timezoneLabel}`}
          />
        </div>
      </div>

      <div>
        <p className={labelClass}>Ends (optional — e.g. rental car return, hotel checkout)</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={endDate}
            min={tripStartDate}
            max={tripEndDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={inputClass}
            title={`Time is in ${timezoneLabel}`}
          />
        </div>
        {endDate && endDate !== startDate && (
          <p className="mt-1 text-[11px] text-brand-blue-600">
            Will also show up on {new Date(`${endDate}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}.
          </p>
        )}
      </div>

      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Address (optional — enables Directions)"
        className={inputClass}
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone number (optional — enables Call)"
        className={inputClass}
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className={inputClass}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="rounded-full bg-brand-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-blue-600 active:scale-95"
        >
          Add
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
