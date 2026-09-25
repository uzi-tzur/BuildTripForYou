"use client";

import { useState, type FormEvent } from "react";
import { isValidGoogleMapsUrl } from "@/lib/stopOverrides";

export function EditDayRouteForm({
  initialUrl,
  onSave,
  onCancel,
}: {
  initialUrl: string;
  onSave: (url: string) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();
    if (!isValidGoogleMapsUrl(trimmed)) {
      setError("That doesn't look like a Google Maps link — copy it from the share/address bar in Google Maps.");
      return;
    }
    onSave(trimmed);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-4 mb-4 space-y-2.5 rounded-xl border border-dashed border-brand-blue-300 bg-brand-blue-50/50 p-3"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Google Maps route for the whole day
      </p>
      <textarea
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setError(null);
        }}
        placeholder="Paste a Google Maps directions link with all of the day's stops"
        rows={3}
        autoFocus
        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm transition-colors focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-100"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
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
