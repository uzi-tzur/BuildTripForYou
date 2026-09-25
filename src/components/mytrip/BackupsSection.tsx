"use client";

import { useEffect, useRef, useState } from "react";
import type { TripBackup } from "@/lib/tripBackup";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function BackupsSection({
  backups,
  existingTripIds,
  onRestore,
  onDeleteBackup,
  onRestoreFile,
  openSignal,
}: {
  /** Changing this opens the section — used after a delete so the way back is right there. */
  openSignal: number;
  backups: TripBackup[];
  /** Ids of trips currently in the list — restoring one of these makes a copy instead of replacing it. */
  existingTripIds: Set<string>;
  onRestore: (backup: TripBackup) => void;
  onDeleteBackup: (backupId: string) => void;
  onRestoreFile: (file: File) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (openSignal > 0) setOpen(true);
  }, [openSignal]);

  return (
    <details
      className="mt-6 rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-100"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer select-none text-sm font-semibold text-slate-700">
        Backups &amp; restore {backups.length > 0 && <span className="font-normal text-slate-400">({backups.length})</span>}
      </summary>

      <div className="mt-3 space-y-2.5">
        {backups.length === 0 && (
          <p className="text-sm text-slate-500">
            No backups yet. Use the 💾 button on a trip to save one — and a backup is also saved automatically whenever you delete a trip.
          </p>
        )}

        {backups.map((backup) => {
          const exists = existingTripIds.has(backup.trip.id);
          return (
            <div key={backup.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{backup.trip.name}</p>
                <p className="text-xs text-slate-500">
                  {backup.reason === "before-delete" ? "Saved when deleted" : "Manual backup"} · {formatWhen(backup.createdAt)}
                  {!exists && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Deleted</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => onRestore(backup)}
                  className="rounded-full bg-brand-green-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-green-600 active:scale-95"
                >
                  {exists ? "Restore as copy" : "Restore"}
                </button>
                {confirmingId === backup.id ? (
                  <button
                    onClick={() => {
                      onDeleteBackup(backup.id);
                      setConfirmingId(null);
                    }}
                    onBlur={() => setConfirmingId(null)}
                    autoFocus
                    className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-600 active:scale-95"
                  >
                    Delete backup?
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmingId(backup.id)}
                    aria-label={`Delete this backup of ${backup.trip.name}`}
                    className="rounded-full px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div className="pt-1">
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onRestoreFile(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInput.current?.click()}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-brand-blue-300 hover:text-brand-blue-700"
          >
            Restore from a backup file…
          </button>
        </div>
      </div>
    </details>
  );
}
