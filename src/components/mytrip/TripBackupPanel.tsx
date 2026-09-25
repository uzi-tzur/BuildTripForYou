"use client";

export function TripBackupPanel({
  onBackupNow,
  onDownload,
  onClose,
}: {
  onBackupNow: () => void;
  onDownload: () => void;
  onClose: () => void;
}) {
  return (
    <div className="mt-3 space-y-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Back up this trip</p>
      <p className="text-xs text-slate-600">
        A backup captures the whole trip — your activities, edits, notes, photos, and day route links. Saved backups stay on this device and are
        listed under <span className="font-semibold">Backups &amp; restore</span> below; a downloaded file can be kept anywhere or restored on another
        device.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onBackupNow}
          className="rounded-full bg-brand-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-blue-600 active:scale-95"
        >
          Save backup now
        </button>
        <button
          onClick={onDownload}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white"
        >
          Download backup file
        </button>
        <button
          onClick={onClose}
          className="rounded-full px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}
