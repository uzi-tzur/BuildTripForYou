"use client";

import { useState, type FormEvent } from "react";
import {
  CUSTOM_STOP_CATEGORIES,
  CUSTOM_STOP_CATEGORY_ICON,
  CUSTOM_STOP_CATEGORY_LABEL,
  type CustomStopCategory,
} from "@/lib/customStops";

/**
 * Renames an activity — and, for one the user added, changes its type
 * (e.g. an "Other" that was really trip insurance). Pre-loaded itinerary
 * stops have no editable type, so `initialCategory` is absent for them.
 */
export function EditTitleForm({
  initialTitle,
  initialCategory,
  onSave,
  onCancel,
}: {
  initialTitle: string;
  initialCategory?: CustomStopCategory;
  onSave: (title: string, category?: CustomStopCategory) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState<CustomStopCategory | undefined>(initialCategory);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSave(trimmed, category);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2.5 space-y-2.5 rounded-xl border border-dashed border-brand-green-300 bg-brand-green-50/50 p-3"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {initialCategory ? "Rename or change type" : "Rename activity"}
      </p>
      {category && (
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as CustomStopCategory)}
          aria-label="Activity type"
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm transition-colors focus:border-brand-green-500 focus:outline-none focus:ring-2 focus:ring-brand-green-100"
        >
          {CUSTOM_STOP_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CUSTOM_STOP_CATEGORY_ICON[c]} {CUSTOM_STOP_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      )}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        autoFocus
        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm transition-colors focus:border-brand-green-500 focus:outline-none focus:ring-2 focus:ring-brand-green-100"
      />
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="rounded-full bg-brand-green-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-green-600 active:scale-95"
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
