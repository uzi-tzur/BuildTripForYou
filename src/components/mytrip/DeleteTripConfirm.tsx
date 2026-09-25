"use client";

import { useState, type FormEvent } from "react";

/** The word that has to be typed before a trip can be deleted. */
export const DELETE_CONFIRM_WORD = "trip";

export function DeleteTripConfirm({
  tripName,
  onConfirm,
  onCancel,
}: {
  tripName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  const ready = typed.trim().toLowerCase() === DELETE_CONFIRM_WORD;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (ready) onConfirm();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 rounded-xl border border-dashed border-red-300 bg-red-50/60 p-3">
      <p className="text-sm font-semibold text-red-800">Delete &ldquo;{tripName}&rdquo;?</p>
      <p className="text-xs text-red-900/80">
        A backup is saved automatically first, so you can bring it back from <span className="font-semibold">Backups &amp; restore</span> below.
      </p>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Type <span className="font-mono normal-case text-red-700">{DELETE_CONFIRM_WORD}</span> to confirm
      </label>
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoFocus
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-label={`Type ${DELETE_CONFIRM_WORD} to confirm deleting ${tripName}`}
        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm transition-colors focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
      />
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!ready}
          className="rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Delete trip
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
