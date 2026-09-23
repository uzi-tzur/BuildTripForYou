"use client";

import { useState, type FormEvent } from "react";

export function EditTitleForm({
  initialTitle,
  onSave,
  onCancel,
}: {
  initialTitle: string;
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSave(trimmed);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2.5 space-y-2.5 rounded-xl border border-dashed border-brand-green-300 bg-brand-green-50/50 p-3"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Rename activity</p>
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
