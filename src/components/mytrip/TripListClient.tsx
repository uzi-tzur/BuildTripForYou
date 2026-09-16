"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { BRAND } from "@/config/brand";
import { formatDateUS } from "@/lib/format";
import { getOrCreateSyncCode, setSyncCode as saveSyncCode } from "@/lib/syncCode";
import {
  cloudTripListAvailable,
  deleteTripFromCloud,
  pullFamilyTrips,
  pushTripToCloud,
} from "@/lib/tripListSync";
import {
  createTrip,
  deleteTrip,
  loadSyncedTripIds,
  loadUserTrips,
  markTripSynced,
  replaceUserTrips,
  SEED_TRIP,
  type TripMeta,
} from "@/lib/trips";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm transition-colors focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-100";

type ListSyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

export function TripListClient() {
  const router = useRouter();
  const [trips, setTrips] = useState<TripMeta[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [syncCode, setSyncCodeState] = useState("");
  const [syncStatus, setSyncStatus] = useState<ListSyncStatus>("idle");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeInputValue, setCodeInputValue] = useState("");
  const [copied, setCopied] = useState(false);

  async function refreshTrips(code: string) {
    const localTrips = loadUserTrips();
    setTrips([SEED_TRIP, ...localTrips]);

    if (!cloudTripListAvailable()) {
      setSyncStatus("offline");
      return;
    }

    setSyncStatus("syncing");
    const result = await pullFamilyTrips(code);
    if (!result.ok) {
      setSyncStatus("error");
      return;
    }

    const cloudTrips = result.data;
    const cloudIds = new Set(cloudTrips.map((t) => t.id));
    const syncedIds = loadSyncedTripIds();
    // Trips this device knows about that the cloud has never seen AND that
    // were never confirmed synced before: genuinely new, push them up.
    // (A trip that WAS synced before but is now missing from the cloud was
    // deleted on another device — dropping it here, instead of re-pushing
    // it, is what stops a deleted trip from coming back to life.)
    const newLocalTrips = localTrips.filter((t) => !cloudIds.has(t.id) && !syncedIds.has(t.id));
    for (const t of newLocalTrips) {
      void pushTripToCloud(t, code).then((ok) => {
        if (ok) markTripSynced(t.id);
      });
    }

    const merged = [...cloudTrips, ...newLocalTrips];
    replaceUserTrips(merged);
    setTrips([SEED_TRIP, ...merged]);
    setSyncStatus("synced");
  }

  useEffect(() => {
    const code = getOrCreateSyncCode();
    setSyncCodeState(code);
    void refreshTrips(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreated(trip: TripMeta) {
    router.push(`/my-trip/${trip.id}`);
    const ok = await pushTripToCloud(trip, syncCode);
    if (ok) markTripSynced(trip.id);
  }

  function handleDelete(id: string) {
    deleteTrip(id);
    setTrips((prev) => prev?.filter((t) => t.id !== id) ?? null);
    void deleteTripFromCloud(id);
  }

  function handleUseCode(event: FormEvent) {
    event.preventDefault();
    if (!codeInputValue.trim()) return;
    const normalized = saveSyncCode(codeInputValue);
    setSyncCodeState(normalized);
    setShowCodeInput(false);
    setCodeInputValue("");
    void refreshTrips(normalized);
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(syncCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — the code is still visible to copy by hand.
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-blue-50/60 via-white to-white">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={64} height={64} className="rounded-2xl shadow-md" />
          <span className="text-xl font-extrabold tracking-tight text-brand-blue-700">{BRAND.name}</span>
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">Your trips</h1>
        <p className="mt-1 text-[15px] text-slate-500">Pick a trip to open it, or start a new one.</p>

        <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Sync code: <span className="font-mono font-semibold tracking-wide text-slate-700">{syncCode}</span>
              {syncStatus === "synced" && " · Synced across your devices"}
              {syncStatus === "syncing" && " · Syncing…"}
              {syncStatus === "error" && " · Sync failed — trips saved on this device"}
              {syncStatus === "offline" && " · Not connected — trips saved on this device only"}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="rounded-full border border-slate-300 px-2.5 py-1 font-semibold text-slate-600 transition-colors hover:border-brand-blue-300 hover:text-brand-blue-700"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => setShowCodeInput((v) => !v)}
                className="rounded-full border border-slate-300 px-2.5 py-1 font-semibold text-slate-600 transition-colors hover:border-brand-blue-300 hover:text-brand-blue-700"
              >
                Use a different code
              </button>
            </div>
          </div>
          <p className="mt-1.5 leading-relaxed">
            Enter this same code on your other phone or browser to see the same trips there.
          </p>

          {showCodeInput && (
            <form onSubmit={handleUseCode} className="mt-2.5 flex gap-2">
              <input
                value={codeInputValue}
                onChange={(e) => setCodeInputValue(e.target.value)}
                placeholder="Code from your other device"
                className={`${inputClass} flex-1`}
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-brand-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-blue-600 active:scale-95"
              >
                Use
              </button>
            </form>
          )}
        </div>

        <div className="mt-7 space-y-3">
          {trips === null && <p className="text-sm text-slate-400">Loading…</p>}

          {trips?.map((trip) => (
            <div
              key={trip.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-100 transition-all hover:shadow-card-hover hover:ring-brand-blue-200"
            >
              <Link href={`/my-trip/${trip.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue-500 to-brand-green-500 text-lg text-white">
                  ✈️
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{trip.name}</p>
                  <p className="text-sm text-slate-500">
                    {formatDateUS(trip.startDate)} → {formatDateUS(trip.endDate)}
                  </p>
                </div>
              </Link>
              {!trip.isSeed && (
                <button
                  onClick={() => handleDelete(trip.id)}
                  aria-label={`Delete ${trip.name}`}
                  className="shrink-0 rounded-full px-2.5 py-1 text-sm text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6">
          {creating ? (
            <NewTripForm onCreated={handleCreated} onCancel={() => setCreating(false)} />
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full rounded-2xl border border-dashed border-slate-300 py-3.5 text-sm font-semibold text-slate-500 transition-all hover:border-brand-blue-400 hover:bg-brand-blue-50/50 hover:text-brand-blue-600"
            >
              + New trip
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function NewTripForm({ onCreated, onCancel }: { onCreated: (trip: TripMeta) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !startDate || !endDate) {
      setError("Trip name, start date, and end date are required.");
      return;
    }
    if (endDate < startDate) {
      setError("End date can't be before the start date.");
      return;
    }

    const trip = createTrip({ name: name.trim(), subtitle: subtitle.trim(), startDate, endDate });
    onCreated(trip);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2.5 rounded-2xl border border-dashed border-brand-blue-300 bg-brand-blue-50/50 p-4 shadow-card"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Trip name (required) — e.g. Italy Spring 2027"
        required
        className={inputClass}
      />
      <input
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        placeholder="Subtitle (optional)"
        className={inputClass}
      />
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className={inputClass} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className={inputClass} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="rounded-full bg-brand-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-blue-600 active:scale-95"
        >
          Create trip
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
