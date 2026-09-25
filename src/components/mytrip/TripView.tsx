"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AddActivityForm } from "@/components/mytrip/AddActivityForm";
import { EditNoteForm } from "@/components/mytrip/EditNoteForm";
import { EditTimeForm } from "@/components/mytrip/EditTimeForm";
import { EditTitleForm } from "@/components/mytrip/EditTitleForm";
import { FlightStatusPanel } from "@/components/mytrip/FlightStatusPanel";
import { EditDayRouteForm } from "@/components/mytrip/EditDayRouteForm";
import { PhotoSearchForm } from "@/components/mytrip/PhotoSearchForm";
import { Chevron } from "@/components/ui/Chevron";
import { DemoBadge } from "@/components/ui/DemoBadge";
import type { TripDay, TripStop } from "@/data/coloradoTrip";
import {
  CUSTOM_STOP_CATEGORY_ICON,
  CUSTOM_STOP_END_LABEL,
  customStopToIso,
  loadCustomStops,
  saveCustomStops,
  type CustomStop,
} from "@/lib/customStops";
import { celsiusToFahrenheit, formatDateUS, weatherKey } from "@/lib/format";
import { cloudSyncAvailable, pullTripSync, pushTripSync } from "@/lib/mytripSync";
import { extractUtcOffset, loadStopOverrides, saveStopOverrides, type StopOverride } from "@/lib/stopOverrides";
import type { TripMeta } from "@/lib/trips";
import type { WeatherCondition } from "@/lib/types";

type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

const KIND_ICON: Record<TripStop["kind"], string> = {
  flight: "✈️",
  drive: "🚗",
  hotel: "🏨",
  meal: "🍴",
  activity: "📍",
  shopping: "🛒",
};

function googleMapsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

/** Universal link — opens the Waze app if installed, else waze.com in browser. */
function wazeUrl(address: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

/** Free-form web search for a place/activity — reviews, hours, current info, etc. */
function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/** No API key needed — Google shows its own weather widget for a plain search like this. */
function weatherServiceUrl(placeName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`weather in ${placeName}, CO`)}`;
}

function formatTripTime(iso: string, timezoneLabel: string): string {
  return (
    new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Denver",
    }) + ` (${timezoneLabel})`
  );
}

/** How to route an edit ("update the time/date") back to the right piece of state. */
type EditRef =
  | { kind: "static"; id: string; date: string; time: string }
  | { kind: "custom-start"; customId: string; date: string; time: string }
  | { kind: "custom-end"; customId: string; date: string; time: string };

/**
 * How to route a note edit back to the right piece of state. Unlike time
 * edits, a custom stop's start/end entries always share ONE note (there's
 * only one CustomStop.notes field), so there's no "custom-start"/"custom-end"
 * split here — just "custom".
 */
type NoteRef = { kind: "static"; id: string } | { kind: "custom"; customId: string };

/** A stop from the pre-loaded itinerary or one the user added, in one shape for rendering/sorting. */
interface DisplayStop {
  id: string;
  time: string | null; // ISO with offset
  timeLabel: string;
  icon: string;
  title: string;
  /** The renamable title without any display-only prefix (e.g. a custom stop's "Return: " label) — what the rename form edits. */
  baseTitle: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  confirmation?: string | null;
  cost?: string | null;
  tip?: string | null;
  warning?: string | null;
  /** A personal note/story the user wrote for this stop — never itinerary data. */
  personalNote?: string | null;
  /** A photo the user picked for this stop via image search — never itinerary data. */
  photoUrl?: string | null;
  photoCaption?: string | null;
  /** Matches a name in the day's weatherLocations — set only on outdoor/town stops. */
  weatherLocationName?: string;
  custom?: CustomStop;
  editable: EditRef;
  noteEditable: NoteRef;
}

interface StaticStopRef {
  originalDate: string;
  index: number;
  stop: TripStop;
  id: string;
}

/**
 * Ids are based on each stop's position in the itinerary, not its date —
 * a trip's dates can shift (see trips.ts's date-shifting for the Colorado
 * itinerary), and a position-based id keeps a stop's overrides (rename,
 * delete, time edit) attached to it across a shift instead of orphaning
 * them under a now-stale date-based key.
 */
function getAllStaticStopRefs(days: TripDay[]): StaticStopRef[] {
  return days.flatMap((day, dayIndex) =>
    day.stops.map((stop, i) => ({ originalDate: day.date, index: i, stop, id: `day${dayIndex}-stop${i}` })),
  );
}

function staticRefToDisplay(
  ref: StaticStopRef,
  override: StopOverride | undefined,
  timezoneLabel: string,
): { forDate: string; entry: DisplayStop } {
  const { stop } = ref;
  // A note-only override (override.date/time both absent) must NOT be
  // treated as "the user changed the time" — that would wipe out the
  // itinerary's original time and show "Time not set" just because someone
  // added a note.
  const hasTimeOverride = override?.date !== undefined || override?.time !== undefined;
  const effectiveDate = override?.date ?? ref.originalDate;
  const effectiveTimeHHMM = hasTimeOverride ? (override!.time ?? "") : stop.time ? stop.time.slice(11, 16) : "";

  let time: string | null;
  let timeLabel: string;
  if (hasTimeOverride) {
    const offset = extractUtcOffset(stop.time);
    time = override!.time ? `${effectiveDate}T${override!.time}:00${offset}` : null;
    timeLabel = time ? formatTripTime(time, timezoneLabel) : "Time not set";
  } else {
    time = stop.time;
    timeLabel = stop.timeLabel;
  }

  return {
    forDate: effectiveDate,
    entry: {
      id: ref.id,
      time,
      timeLabel,
      icon: KIND_ICON[stop.kind],
      title: override?.title ?? stop.title,
      baseTitle: override?.title ?? stop.title,
      description: stop.description,
      address: stop.address,
      confirmation: stop.confirmation,
      cost: stop.cost,
      tip: stop.tip,
      warning: stop.warning,
      personalNote: override?.note ?? null,
      photoUrl: override?.photoUrl ?? null,
      photoCaption: override?.photoCaption ?? null,
      weatherLocationName: stop.weatherLocationName,
      editable: { kind: "static", id: ref.id, date: effectiveDate, time: effectiveTimeHHMM },
      noteEditable: { kind: "static", id: ref.id },
    },
  };
}

/**
 * A custom stop produces one display entry on its start date, and — if it
 * has an end date different from the start (rental car return, hotel
 * checkout, etc.) — a second, linked entry auto-added on that end date.
 * Both entries share the same CustomStop.id, so removing (or editing
 * dates so they collapse back to the same day) keeps them in sync.
 */
function customToDisplayEntries(
  stop: CustomStop,
  utcOffset: string,
  timezoneLabel: string,
): { forDate: string; entry: DisplayStop }[] {
  const entries: { forDate: string; entry: DisplayStop }[] = [
    {
      forDate: stop.date,
      entry: {
        id: `custom-${stop.id}-start`,
        time: stop.time ? customStopToIso(stop.date, stop.time, utcOffset) : null,
        timeLabel: stop.time ? formatTripTime(customStopToIso(stop.date, stop.time, utcOffset), timezoneLabel) : "Time not set",
        icon: CUSTOM_STOP_CATEGORY_ICON[stop.category],
        title: stop.title,
        baseTitle: stop.title,
        address: stop.address,
        phone: stop.phone,
        personalNote: stop.notes,
        photoUrl: stop.photoUrl ?? null,
        photoCaption: stop.photoCaption ?? null,
        custom: stop,
        editable: { kind: "custom-start", customId: stop.id, date: stop.date, time: stop.time ?? "" },
        noteEditable: { kind: "custom", customId: stop.id },
      },
    },
  ];

  if (stop.endDate && stop.endDate !== stop.date) {
    entries.push({
      forDate: stop.endDate,
      entry: {
        id: `custom-${stop.id}-end`,
        time: stop.endTime ? customStopToIso(stop.endDate, stop.endTime, utcOffset) : null,
        timeLabel: stop.endTime
          ? formatTripTime(customStopToIso(stop.endDate, stop.endTime, utcOffset), timezoneLabel)
          : "Time not set",
        icon: CUSTOM_STOP_CATEGORY_ICON[stop.category],
        title: `${CUSTOM_STOP_END_LABEL[stop.category]}: ${stop.title}`,
        baseTitle: stop.title,
        address: stop.address,
        phone: stop.phone,
        personalNote: stop.notes,
        photoUrl: stop.photoUrl ?? null,
        photoCaption: stop.photoCaption ?? null,
        custom: stop,
        editable: { kind: "custom-end", customId: stop.id, date: stop.endDate, time: stop.endTime ?? "" },
        noteEditable: { kind: "custom", customId: stop.id },
      },
    });
  }

  return entries;
}

function daysWithDisplayStops(
  days: TripDay[],
  customStops: CustomStop[],
  overrides: Record<string, StopOverride>,
  utcOffset: string,
  timezoneLabel: string,
): { day: TripDay; stops: DisplayStop[] }[] {
  const staticEntries = getAllStaticStopRefs(days)
    .filter((ref) => !overrides[ref.id]?.deleted)
    .map((ref) => staticRefToDisplay(ref, overrides[ref.id], timezoneLabel));
  const customEntries = customStops.flatMap((s) => customToDisplayEntries(s, utcOffset, timezoneLabel));
  const allEntries = [...staticEntries, ...customEntries];

  return days.map((day) => {
    const forThisDay = allEntries.filter((e) => e.forDate === day.date).map((e) => e.entry);
    forThisDay.sort((a, b) => {
      if (a.time && b.time) return new Date(a.time).getTime() - new Date(b.time).getTime();
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
    return { day, stops: forThisDay };
  });
}

interface FlatStop {
  dayDate: string;
  stop: DisplayStop;
  t: number;
}

function flattenTimedStops(days: { day: TripDay; stops: DisplayStop[] }[]): FlatStop[] {
  return days
    .flatMap(({ day, stops }) =>
      stops.filter((s) => s.time).map((stop) => ({ dayDate: day.date, stop, t: new Date(stop.time!).getTime() })),
    )
    .sort((a, b) => a.t - b.t);
}

function formatSyncedAgo(iso: string | null): string {
  if (!iso) return "";
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function WeatherSyncRow({ updatedAt, onRefresh }: { updatedAt: string | null; onRefresh: () => Promise<void> }) {
  const [refreshing, setRefreshing] = useState(false);

  async function handleClick() {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <span>🌤️</span>
        {refreshing ? "Updating weather…" : updatedAt ? `Weather updated ${formatSyncedAgo(updatedAt)}` : "Weather not loaded yet"}
      </span>
      <button
        onClick={() => void handleClick()}
        disabled={refreshing}
        className="flex shrink-0 items-center gap-1 rounded-full border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-blue-300 hover:text-brand-blue-700 disabled:opacity-50"
      >
        ↻ Refresh weather
      </button>
    </div>
  );
}

function SyncIndicator({
  status,
  lastSyncedAt,
  onSync,
}: {
  status: SyncStatus;
  lastSyncedAt: string | null;
  onSync: () => void;
}) {
  const label =
    status === "synced"
      ? `Synced${lastSyncedAt ? ` · ${formatSyncedAgo(lastSyncedAt)}` : ""}`
      : status === "error"
        ? "Sync failed — saved on this device"
        : status === "offline"
          ? "Not connected — saved on this device only"
          : "Syncing…";

  const dotClass =
    status === "synced"
      ? "bg-brand-green-500"
      : status === "error"
        ? "bg-amber-500"
        : status === "offline"
          ? "bg-slate-400"
          : "bg-brand-blue-400 animate-pulse";

  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
        {label}
      </span>
      <button
        onClick={onSync}
        disabled={status === "syncing"}
        className="flex shrink-0 items-center gap-1 rounded-full border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-blue-300 hover:text-brand-blue-700 disabled:opacity-50"
      >
        ↻ Sync now
      </button>
    </div>
  );
}

/**
 * Calendar-day difference, ignoring time-of-day — "today is Sep 15, trip
 * starts Sep 27" should always read 12, not 13 just because it's still
 * morning and the first flight isn't for another 12 days and a few hours.
 * Both dates are read as local calendar dates so it matches how a human
 * looking at a calendar would count, regardless of what timezone the
 * trip's first stop happens to be in.
 */
function daysUntilDate(dateStr: string, now: Date): number {
  const target = new Date(`${dateStr}T00:00:00`);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - todayMidnight.getTime()) / 86_400_000);
}

function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);

    // Mobile browsers throttle or fully pause setInterval while a tab/PWA
    // is backgrounded, so reopening the app a day later can still show
    // whatever "now" the last tick computed, possibly hours or days stale,
    // until the throttled interval happens to fire again. Refreshing on
    // visibilitychange fixes it the instant the app comes back to the
    // foreground instead of waiting on that timer.
    function handleVisibility() {
      if (document.visibilityState === "visible") setNow(new Date());
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
  return now;
}

export function TripView({
  trip,
  days,
  weatherByKey,
  usingMockWeather,
  weatherUpdatedAt,
  onRefreshWeather,
}: {
  trip: TripMeta;
  days: TripDay[];
  weatherByKey: Record<string, WeatherCondition | null>;
  usingMockWeather: boolean;
  weatherUpdatedAt: string | null;
  onRefreshWeather: () => Promise<void>;
}) {
  const now = useNow();
  const [customStops, setCustomStops] = useState<CustomStop[]>([]);
  const [overrides, setOverrides] = useState<Record<string, StopOverride>>({});
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const customStopsRef = useRef<CustomStop[]>([]);
  const overridesRef = useRef<Record<string, StopOverride>>({});

  async function pushToCloud(nextCustomStops: CustomStop[], nextOverrides: Record<string, StopOverride>) {
    if (!cloudSyncAvailable()) {
      setSyncStatus("offline");
      return;
    }
    setSyncStatus("syncing");
    const ok = await pushTripSync(trip.id, nextCustomStops, nextOverrides);
    setSyncStatus(ok ? "synced" : "error");
    if (ok) setLastSyncedAt(new Date().toISOString());
  }

  /** Pulls the latest from the cloud and applies it locally (cloud wins). */
  async function syncFromCloud() {
    if (!cloudSyncAvailable()) {
      setSyncStatus("offline");
      return;
    }
    setSyncStatus("syncing");
    const result = await pullTripSync(trip.id);
    if (!result.ok) {
      setSyncStatus("error");
      return;
    }
    if (result.data) {
      setCustomStops(result.data.customStops);
      setOverrides(result.data.overrides);
      customStopsRef.current = result.data.customStops;
      overridesRef.current = result.data.overrides;
      saveCustomStops(trip.id, result.data.customStops);
      saveStopOverrides(trip.id, result.data.overrides);
      setLastSyncedAt(result.data.updatedAt);
    }
    setSyncStatus("synced");
  }

  /** "Sync now": uploads whatever this device has, then pulls the latest merged state. */
  async function manualSync() {
    if (!cloudSyncAvailable()) {
      setSyncStatus("offline");
      return;
    }
    setSyncStatus("syncing");
    await pushTripSync(trip.id, customStopsRef.current, overridesRef.current);
    await syncFromCloud();
  }

  useEffect(() => {
    const localStops = loadCustomStops(trip.id);
    const localOverrides = loadStopOverrides(trip.id);
    setCustomStops(localStops);
    setOverrides(localOverrides);
    customStopsRef.current = localStops;
    overridesRef.current = localOverrides;

    if (!cloudSyncAvailable()) {
      setSyncStatus("offline");
      return;
    }

    setSyncStatus("syncing");
    pullTripSync(trip.id).then((result) => {
      if (!result.ok) {
        setSyncStatus("error");
        return;
      }
      if (result.data) {
        setCustomStops(result.data.customStops);
        setOverrides(result.data.overrides);
        customStopsRef.current = result.data.customStops;
        overridesRef.current = result.data.overrides;
        saveCustomStops(trip.id, result.data.customStops);
        saveStopOverrides(trip.id, result.data.overrides);
        setLastSyncedAt(result.data.updatedAt);
        setSyncStatus("synced");
      } else {
        // No cloud row yet for this trip — push whatever this device has
        // (even if empty) so the row exists and every other device sees it.
        void pushToCloud(localStops, localOverrides);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);

  // Re-sync when returning to this tab/app — catches edits made on another
  // device while this one was in the background, without polling.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") void syncFromCloud();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);

  function addCustomStop(stop: CustomStop) {
    setCustomStops((prev) => {
      const next = [...prev, stop];
      saveCustomStops(trip.id, next);
      customStopsRef.current = next;
      void pushToCloud(next, overridesRef.current);
      return next;
    });
  }

  function removeCustomStop(id: string) {
    setCustomStops((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveCustomStops(trip.id, next);
      customStopsRef.current = next;
      void pushToCloud(next, overridesRef.current);
      return next;
    });
  }

  function editStaticStop(id: string, date: string, time: string) {
    setOverrides((prev) => {
      const next = { ...prev, [id]: { ...prev[id], date, time: time || null } };
      saveStopOverrides(trip.id, next);
      overridesRef.current = next;
      void pushToCloud(customStopsRef.current, next);
      return next;
    });
  }

  function editCustomStop(customId: string, side: "start" | "end", date: string, time: string) {
    setCustomStops((prev) => {
      const next = prev.map((s) => {
        if (s.id !== customId) return s;
        return side === "start"
          ? { ...s, date, time: time || null }
          : { ...s, endDate: date, endTime: time || null };
      });
      saveCustomStops(trip.id, next);
      customStopsRef.current = next;
      void pushToCloud(next, overridesRef.current);
      return next;
    });
  }

  function handleEdit(ref: EditRef, date: string, time: string) {
    if (ref.kind === "static") editStaticStop(ref.id, date, time);
    else if (ref.kind === "custom-start") editCustomStop(ref.customId, "start", date, time);
    else editCustomStop(ref.customId, "end", date, time);
  }

  function editStaticNote(id: string, note: string) {
    setOverrides((prev) => {
      const next = { ...prev, [id]: { ...prev[id], note: note || null } };
      saveStopOverrides(trip.id, next);
      overridesRef.current = next;
      void pushToCloud(customStopsRef.current, next);
      return next;
    });
  }

  function editCustomStopNote(customId: string, note: string) {
    setCustomStops((prev) => {
      const next = prev.map((s) => (s.id === customId ? { ...s, notes: note || null } : s));
      saveCustomStops(trip.id, next);
      customStopsRef.current = next;
      void pushToCloud(next, overridesRef.current);
      return next;
    });
  }

  function handleNoteEdit(ref: NoteRef, note: string) {
    if (ref.kind === "static") editStaticNote(ref.id, note);
    else editCustomStopNote(ref.customId, note);
  }

  function editStaticTitle(id: string, title: string) {
    setOverrides((prev) => {
      const next = { ...prev, [id]: { ...prev[id], title } };
      saveStopOverrides(trip.id, next);
      overridesRef.current = next;
      void pushToCloud(customStopsRef.current, next);
      return next;
    });
  }

  function editCustomStopTitle(customId: string, title: string) {
    setCustomStops((prev) => {
      const next = prev.map((s) => (s.id === customId ? { ...s, title } : s));
      saveCustomStops(trip.id, next);
      customStopsRef.current = next;
      void pushToCloud(next, overridesRef.current);
      return next;
    });
  }

  function handleTitleEdit(ref: NoteRef, title: string) {
    if (ref.kind === "static") editStaticTitle(ref.id, title);
    else editCustomStopTitle(ref.customId, title);
  }

  function editStaticPhoto(id: string, photoUrl: string, photoCaption: string) {
    setOverrides((prev) => {
      const next = { ...prev, [id]: { ...prev[id], photoUrl, photoCaption: photoCaption || null } };
      saveStopOverrides(trip.id, next);
      overridesRef.current = next;
      void pushToCloud(customStopsRef.current, next);
      return next;
    });
  }

  function editCustomStopPhoto(customId: string, photoUrl: string, photoCaption: string) {
    setCustomStops((prev) => {
      const next = prev.map((s) => (s.id === customId ? { ...s, photoUrl, photoCaption: photoCaption || null } : s));
      saveCustomStops(trip.id, next);
      customStopsRef.current = next;
      void pushToCloud(next, overridesRef.current);
      return next;
    });
  }

  /** Day-level entries use the key `day${index}` — same position-based scheme as stop ids, so a date shift doesn't orphan the link. */
  function editDayRoute(dayIndex: number, routeUrl: string | null) {
    const id = `day${dayIndex}`;
    setOverrides((prev) => {
      const next = { ...prev, [id]: { ...prev[id], routeUrl } };
      saveStopOverrides(trip.id, next);
      overridesRef.current = next;
      void pushToCloud(customStopsRef.current, next);
      return next;
    });
  }

  function handlePhotoEdit(ref: NoteRef, photoUrl: string, photoCaption: string) {
    if (ref.kind === "static") editStaticPhoto(ref.id, photoUrl, photoCaption);
    else editCustomStopPhoto(ref.customId, photoUrl, photoCaption);
  }

  /** Hides a pre-loaded itinerary stop for this device — the base data can't be mutated, so it's marked deleted instead. */
  function removeStaticStop(id: string) {
    setOverrides((prev) => {
      const next = { ...prev, [id]: { ...prev[id], deleted: true } };
      saveStopOverrides(trip.id, next);
      overridesRef.current = next;
      void pushToCloud(customStopsRef.current, next);
      return next;
    });
  }

  function handleRemove(ref: NoteRef) {
    if (ref.kind === "static") removeStaticStop(ref.id);
    else removeCustomStop(ref.customId);
  }

  const daysWithStops = useMemo(
    () => daysWithDisplayStops(days, customStops, overrides, trip.timezoneOffset, trip.timezoneLabel),
    [days, customStops, overrides, trip.timezoneOffset, trip.timezoneLabel],
  );
  const timed = flattenTimedStops(daysWithStops);

  let phase: "before" | "during" | "after" | "unknown" = "unknown";
  let current: FlatStop | undefined;
  let next: FlatStop | undefined;
  let activeDate: string | undefined;

  if (now && timed.length > 0) {
    const nowMs = now.getTime();
    const firstT = timed[0]!.t;
    const lastT = timed[timed.length - 1]!.t;

    if (nowMs < firstT) {
      phase = "before";
      next = timed[0];
      activeDate = days[0]?.date;
    } else if (nowMs > lastT + 3 * 60 * 60_000) {
      phase = "after";
      activeDate = days[days.length - 1]?.date;
    } else {
      phase = "during";
      current = [...timed].reverse().find((e) => e.t <= nowMs);
      next = timed.find((e) => e.t > nowMs);
      activeDate = (current ?? next)?.dayDate;
    }
  }

  const daysUntil = now && timed.length > 0 ? daysUntilDate(trip.startDate, now) : null;

  return (
    <main className="mx-auto max-w-2xl pb-24">
      <div className={trip.heroImage ? "relative h-64 w-full overflow-hidden sm:h-80 sm:rounded-b-[2rem]" : "relative w-full overflow-hidden bg-gradient-to-br from-brand-blue-600 via-brand-blue-500 to-brand-green-500 px-4 pb-8 pt-6 sm:rounded-b-[2rem] sm:px-6"}>
        {trip.heroImage && (
          <>
            <Image
              src={trip.heroImage}
              alt=""
              fill
              priority
              sizes="(max-width: 672px) 100vw, 672px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/10" />
          </>
        )}

        <div className={trip.heroImage ? "absolute inset-x-0 top-0 flex items-center justify-between p-4" : "flex items-center justify-between"}>
          <Link
            href="/my-trip"
            className="flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/35"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
              <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All trips
          </Link>
          <Image src="/logo.png" alt="" width={128} height={128} className="rounded-2xl shadow-lg ring-2 ring-white/40" />
        </div>

        <div className={trip.heroImage ? "absolute inset-x-0 bottom-0 p-5" : "mt-10"}>
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-4xl">{trip.name}</h1>
          <p className={trip.heroImage ? "mt-1 text-sm font-medium text-slate-100" : "mt-1 text-sm font-medium text-white/90"}>
            {formatDateUS(trip.startDate)} → {formatDateUS(trip.endDate)}
          </p>
        </div>
      </div>
      {trip.heroCaption && (
        <p className="px-4 pt-1.5 text-right text-[11px] font-medium text-slate-400 sm:px-6">{trip.heroCaption}</p>
      )}

      <div className="px-4 sm:px-6">
        <SyncIndicator status={syncStatus} lastSyncedAt={lastSyncedAt} onSync={() => void manualSync()} />
        <WeatherSyncRow updatedAt={weatherUpdatedAt} onRefresh={onRefreshWeather} />
        {trip.subtitle && <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{trip.subtitle}</p>}

        {phase === "before" && daysUntil !== null && (
          <div className="mt-5 rounded-2xl bg-gradient-to-br from-brand-blue-50 to-brand-green-50 p-5 text-center shadow-card">
            <p className="text-4xl font-extrabold tracking-tight text-brand-blue-700">
              {daysUntil} <span className="text-2xl font-bold text-brand-blue-500">day{daysUntil === 1 ? "" : "s"}</span>
            </p>
            <p className="mt-0.5 text-sm font-medium text-brand-blue-600">until your trip starts</p>
          </div>
        )}

        {phase === "during" && (current || next) && (
          <div className="mt-5 space-y-3 rounded-2xl border border-brand-green-200 bg-brand-green-50 p-4 shadow-card">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-green-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green-500" />
              </span>
              Right now
            </p>
            {current && <StopSummary label="Current" stop={current.stop} />}
            {next && <StopSummary label="Next" stop={next.stop} />}
          </div>
        )}

        {phase === "after" && (
          <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-center text-slate-600 shadow-card">
            Hope you had a great trip! Here&apos;s the full itinerary for reference.
          </div>
        )}

        {days.length === 0 && (
          <p className="mt-8 text-center text-sm text-slate-400">This trip has no days yet.</p>
        )}

        <div className="mt-8 space-y-5">
          {daysWithStops.map(({ day, stops }, dayIndex) => (
            <DaySection
              key={day.date}
              day={day}
              stops={stops}
              routeUrl={overrides[`day${dayIndex}`]?.routeUrl ?? null}
              onEditRoute={(url) => editDayRoute(dayIndex, url)}
              isActive={day.date === activeDate}
              currentStopId={phase === "during" ? current?.stop.id : undefined}
              weatherEntries={day.weatherLocations.map((loc) => ({
                name: loc.name,
                weather: weatherByKey[weatherKey(day.date, loc.name)] ?? null,
              }))}
              usingMockWeather={usingMockWeather}
              tripStartDate={trip.startDate}
              tripEndDate={trip.endDate}
              timezoneLabel={trip.timezoneLabel}
              onAddStop={addCustomStop}
              onRemoveStop={handleRemove}
              onEditStop={handleEdit}
              onEditNote={handleNoteEdit}
              onEditTitle={handleTitleEdit}
              onEditPhoto={handlePhotoEdit}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function StopSummary({ label, stop }: { label: string; stop: DisplayStop }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-base shadow-sm ring-1 ring-black/5">
        {stop.icon}
      </span>
      <div className="min-w-0">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-green-700">{label}</span>
        <p className="truncate font-semibold text-slate-900">{stop.title}</p>
        <p className="text-xs text-slate-500">{stop.timeLabel}</p>
      </div>
    </div>
  );
}

/** How high a chance has to be before a time window counts as "likely to rain". */
const RAIN_LIKELY_THRESHOLD = 30;

function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", timeZone: "America/Denver" });
}

/**
 * Picks out the forecast intervals with a meaningful rain chance and
 * describes them as a time range, e.g. "2–5 PM" — or "2 PM" if only one
 * interval clears the threshold. Returns null when nothing in the day is
 * likely enough to call out.
 */
function rainWindowLabel(windows: { time: string; chance: number }[] | null): string | null {
  if (!windows) return null;
  const likely = windows.filter((w) => w.chance >= RAIN_LIKELY_THRESHOLD).sort((a, b) => a.time.localeCompare(b.time));
  if (likely.length === 0) return null;
  const start = formatHour(likely[0]!.time);
  const end = formatHour(likely[likely.length - 1]!.time);
  return start === end ? start : `${start}–${end}`;
}

/** Daily low/high and precipitation chance for one named place. */
function WeatherChip({
  name,
  weather,
  usingMockWeather,
}: {
  name: string;
  weather: WeatherCondition | null;
  usingMockWeather: boolean;
}) {
  return (
    <a
      href={weatherServiceUrl(name)}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex items-start gap-1.5 rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-black/5 transition-colors hover:bg-brand-blue-50 hover:text-brand-blue-700"
    >
      <span>🌤️</span>
      {weather ? (
        <span className="min-w-0">
          <span className="block font-semibold">{name}</span>
          <span className="block">
            L {celsiusToFahrenheit(weather.temperatureMinC ?? weather.temperatureC ?? 0)}° · H {celsiusToFahrenheit(
              weather.temperatureMaxC ?? weather.temperatureC ?? 0,
            )}°
          </span>
          <span className="block text-slate-500">
            Precipitation: {weather.precipitationChance == null ? "—" : `${weather.precipitationChance}%`}
          </span>
          {(() => {
            const label = rainWindowLabel(weather.precipitationWindows);
            return label ? <span className="block text-brand-blue-600">☔ Rain likely {label}</span> : null;
          })()}
        </span>
      ) : (
        <span className="min-w-0">
          <span className="block font-semibold">{name}</span>
          <span className="block text-slate-400">Weather unavailable</span>
        </span>
      )}
      {weather && usingMockWeather && <DemoBadge label="Est." />}
    </a>
  );
}

function DaySection({
  day,
  stops,
  isActive,
  currentStopId,
  weatherEntries,
  usingMockWeather,
  tripStartDate,
  tripEndDate,
  timezoneLabel,
  routeUrl,
  onEditRoute,
  onAddStop,
  onRemoveStop,
  onEditStop,
  onEditNote,
  onEditTitle,
  onEditPhoto,
}: {
  day: TripDay;
  stops: DisplayStop[];
  routeUrl: string | null;
  onEditRoute: (url: string | null) => void;
  isActive: boolean;
  currentStopId?: string;
  weatherEntries: { name: string; weather: WeatherCondition | null }[];
  usingMockWeather: boolean;
  tripStartDate: string;
  tripEndDate: string;
  timezoneLabel: string;
  onAddStop: (stop: CustomStop) => void;
  onRemoveStop: (ref: NoteRef) => void;
  onEditStop: (ref: EditRef, date: string, time: string) => void;
  onEditNote: (ref: NoteRef, note: string) => void;
  onEditTitle: (ref: NoteRef, title: string) => void;
  onEditPhoto: (ref: NoteRef, photoUrl: string, photoCaption: string) => void;
}) {
  const [open, setOpen] = useState(isActive);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [checkingWeatherId, setCheckingWeatherId] = useState<string | null>(null);
  const [checkingFlightId, setCheckingFlightId] = useState<string | null>(null);
  const [editingRoute, setEditingRoute] = useState(false);
  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <section
      className={`overflow-hidden rounded-2xl bg-white shadow-card transition-shadow ${isActive ? "ring-2 ring-brand-blue-400" : "ring-1 ring-slate-100"}`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-4 text-left transition-colors hover:bg-slate-50/80"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-blue-500">{day.dayLabel}</p>
          {day.title && <p className="mt-0.5 font-semibold text-slate-900">{day.title}</p>}
        </div>
        <Chevron open={open} />
      </button>

      {weatherEntries.length > 0 && (
        <div className="-mt-2 flex flex-wrap items-center gap-1.5 px-4 pb-4">
          {weatherEntries.map((entry) => (
            <WeatherChip key={entry.name} name={entry.name} weather={entry.weather} usingMockWeather={usingMockWeather} />
          ))}
        </div>
      )}

      <div className={`flex flex-wrap items-center gap-1.5 px-4 pb-4 ${weatherEntries.length > 0 ? "" : "-mt-2"}`}>
        {routeUrl ? (
          <>
            <a
              href={routeUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="whitespace-nowrap rounded-full bg-brand-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-blue-600 active:scale-95"
            >
              🗺️ Day route in Google Maps
            </a>
            <button
              onClick={() => setEditingRoute((v) => !v)}
              aria-label="Edit the day's Google Maps link"
              className="rounded-full p-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-blue-600"
            >
              ✏️
            </button>
            <button
              onClick={() => onEditRoute(null)}
              aria-label="Remove the day's Google Maps link"
              className="rounded-full p-1.5 text-xs text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              🗑️
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditingRoute((v) => !v)}
            className="whitespace-nowrap rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:border-brand-blue-400 hover:text-brand-blue-600 active:scale-95"
          >
            🗺️ Add day route link
          </button>
        )}
      </div>

      {editingRoute && (
        <EditDayRouteForm
          initialUrl={routeUrl ?? ""}
          onSave={(url) => {
            onEditRoute(url);
            setEditingRoute(false);
          }}
          onCancel={() => setEditingRoute(false)}
        />
      )}

      {open && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-4">
          {stops.length > 0 && (
            <ol className="space-y-3">
              {stops.map((stop) => {
                const isEditing = editingId === stop.id;
                const isEditingNote = editingNoteId === stop.id;
                const isEditingTitle = editingTitleId === stop.id;
                const isEditingPhoto = editingPhotoId === stop.id;
                const isCheckingWeather = checkingWeatherId === stop.id;
                const isCheckingFlight = checkingFlightId === stop.id;
                return (
                  <li
                    key={stop.id}
                    className={`rounded-xl border-l-[3px] p-3 transition-colors ${
                      stop.id === currentStopId
                        ? "border-l-brand-green-500 bg-brand-green-50/70 ring-1 ring-brand-green-200"
                        : "border-l-transparent bg-slate-50 hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-base shadow-sm ring-1 ring-black/5">
                        {stop.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-400">{stop.timeLabel}</p>
                            <p className="font-semibold leading-snug text-slate-900">
                              {stop.title}
                              {stop.custom && (
                                <span className="ml-2 inline-block rounded-full bg-brand-blue-50 px-1.5 py-0.5 align-middle text-[10px] font-medium text-brand-blue-600">
                                  Added by you
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <button
                              onClick={() => setEditingTitleId(isEditingTitle ? null : stop.id)}
                              aria-label="Rename activity"
                              className="rounded-full p-1 text-slate-400 transition-colors hover:bg-white hover:text-brand-green-600"
                            >
                              🏷️
                            </button>
                            <button
                              onClick={() => setEditingNoteId(isEditingNote ? null : stop.id)}
                              aria-label={stop.personalNote ? "Edit your note" : "Add a note"}
                              className="rounded-full p-1 text-slate-400 transition-colors hover:bg-white hover:text-amber-600"
                            >
                              📝
                            </button>
                            <button
                              onClick={() => setEditingId(isEditing ? null : stop.id)}
                              aria-label="Update date/time"
                              className="rounded-full p-1 text-slate-400 transition-colors hover:bg-white hover:text-brand-blue-600"
                            >
                              ✏️
                            </button>
                          </div>
                        </div>

                        {stop.weatherLocationName ? (
                          (() => {
                            const match = weatherEntries.find((e) => e.name === stop.weatherLocationName);
                            return match ? (
                              <div className="mt-1.5">
                                <WeatherChip name={match.name} weather={match.weather} usingMockWeather={usingMockWeather} />
                              </div>
                            ) : null;
                          })()
                        ) : (
                          isCheckingWeather &&
                          weatherEntries.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {weatherEntries.map((entry) => (
                                <WeatherChip
                                  key={entry.name}
                                  name={entry.name}
                                  weather={entry.weather}
                                  usingMockWeather={usingMockWeather}
                                />
                              ))}
                            </div>
                          )
                        )}

                        {stop.photoUrl && (
                          <div className="mt-2">
                            <div className="relative h-32 w-full overflow-hidden rounded-lg ring-1 ring-black/5">
                              <Image src={stop.photoUrl} alt="" fill sizes="400px" className="object-cover" />
                            </div>
                            {stop.photoCaption && <p className="mt-1 text-[11px] text-slate-400">{stop.photoCaption}</p>}
                          </div>
                        )}

                        {stop.custom?.flightNumber && (
                          <p className="mt-1 text-sm text-slate-500">
                            ✈️ {stop.custom.flightNumber}
                            {stop.custom.airline && ` · ${stop.custom.airline}`}
                            {stop.custom.airport && ` · ${stop.custom.airport}`}
                          </p>
                        )}
                        {isCheckingFlight && stop.custom?.flightNumber && (
                          <FlightStatusPanel
                            flightNumber={stop.custom.flightNumber}
                            airport={stop.custom.airport ?? null}
                            airline={stop.custom.airline ?? null}
                          />
                        )}

                        {stop.description && <p className="mt-1 text-sm leading-relaxed text-slate-600">{stop.description}</p>}
                        {stop.phone && <p className="mt-1 text-sm text-slate-500">📞 {stop.phone}</p>}
                        {stop.cost && <p className="mt-1 text-sm text-slate-500">💰 {stop.cost}</p>}
                        {stop.confirmation && <p className="mt-1 font-mono text-xs text-slate-500">{stop.confirmation}</p>}
                        {stop.tip && (
                          <p className="mt-2 rounded-lg bg-brand-blue-50 px-2.5 py-1.5 text-xs text-brand-blue-800">💡 {stop.tip}</p>
                        )}
                        {stop.warning && (
                          <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">⚠️ {stop.warning}</p>
                        )}
                        {stop.personalNote && !isEditingNote && (
                          <p className="mt-2 whitespace-pre-wrap rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs text-violet-900">
                            📝 {stop.personalNote}
                          </p>
                        )}

                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {stop.phone && (
                            <a
                              href={`tel:${stop.phone.replace(/[^\d+]/g, "")}`}
                              className="whitespace-nowrap rounded-full border border-brand-blue-500 px-3 py-1.5 text-xs font-semibold text-brand-blue-600 shadow-sm transition-all hover:bg-brand-blue-50 active:scale-95"
                            >
                              Call
                            </a>
                          )}
                          {stop.address && (
                            <a
                              href={googleMapsUrl(stop.address)}
                              target="_blank"
                              rel="noreferrer"
                              className="whitespace-nowrap rounded-full bg-brand-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-blue-600 active:scale-95"
                            >
                              Google Maps
                            </a>
                          )}
                          {stop.address && (
                            <a
                              href={wazeUrl(stop.address)}
                              target="_blank"
                              rel="noreferrer"
                              className="whitespace-nowrap rounded-full bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-sky-600 active:scale-95"
                            >
                              Waze
                            </a>
                          )}
                          <a
                            href={googleSearchUrl(stop.address ? `${stop.title} ${stop.address}` : stop.title)}
                            target="_blank"
                            rel="noreferrer"
                            className="whitespace-nowrap rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-brand-blue-300 hover:text-brand-blue-700 active:scale-95"
                          >
                            🔍 Search
                          </a>
                          {!stop.weatherLocationName && weatherEntries.length > 0 && (
                            <button
                              onClick={() => setCheckingWeatherId(isCheckingWeather ? null : stop.id)}
                              className="whitespace-nowrap rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-sky-300 hover:text-sky-700 active:scale-95"
                            >
                              🌦️ {isCheckingWeather ? "Hide Weather" : "Check Weather"}
                            </button>
                          )}
                          {stop.custom?.flightNumber && (
                            <button
                              onClick={() => setCheckingFlightId(isCheckingFlight ? null : stop.id)}
                              className="whitespace-nowrap rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-sky-300 hover:text-sky-700 active:scale-95"
                            >
                              ✈️ {isCheckingFlight ? "Hide Flight Status" : "Check Flight Status"}
                            </button>
                          )}
                          <button
                            onClick={() => setEditingPhotoId(isEditingPhoto ? null : stop.id)}
                            className="whitespace-nowrap rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-violet-300 hover:text-violet-700 active:scale-95"
                          >
                            🖼️ Image Search
                          </button>
                          <button
                            onClick={() => onRemoveStop(stop.noteEditable)}
                            aria-label="Remove this activity"
                            className="whitespace-nowrap rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 transition-all hover:border-red-400 hover:text-red-500 active:scale-95"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>

                    {isEditing && (
                      <EditTimeForm
                        label={stop.title}
                        initialDate={stop.editable.date}
                        initialTime={stop.editable.time}
                        tripStartDate={tripStartDate}
                        tripEndDate={tripEndDate}
                        timezoneLabel={timezoneLabel}
                        onSave={(date, time) => {
                          onEditStop(stop.editable, date, time);
                          setEditingId(null);
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    )}

                    {isEditingNote && (
                      <EditNoteForm
                        label={stop.title}
                        initialNote={stop.personalNote ?? ""}
                        onSave={(note) => {
                          onEditNote(stop.noteEditable, note);
                          setEditingNoteId(null);
                        }}
                        onCancel={() => setEditingNoteId(null)}
                      />
                    )}

                    {isEditingTitle && (
                      <EditTitleForm
                        initialTitle={stop.baseTitle}
                        onSave={(title) => {
                          onEditTitle(stop.noteEditable, title);
                          setEditingTitleId(null);
                        }}
                        onCancel={() => setEditingTitleId(null)}
                      />
                    )}

                    {isEditingPhoto && (
                      <PhotoSearchForm
                        heading={`Search a photo for ${stop.baseTitle}`}
                        initialQuery={stop.baseTitle}
                        onSave={(url, caption) => {
                          onEditPhoto(stop.noteEditable, url, caption);
                          setEditingPhotoId(null);
                        }}
                        onCancel={() => setEditingPhotoId(null)}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {adding ? (
            <AddActivityForm
              date={day.date}
              tripStartDate={tripStartDate}
              tripEndDate={tripEndDate}
              timezoneLabel={timezoneLabel}
              onAdd={(stop) => {
                onAddStop(stop);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-semibold text-slate-500 transition-all hover:border-brand-blue-400 hover:bg-brand-blue-50/50 hover:text-brand-blue-600"
            >
              + Add activity
            </button>
          )}
        </div>
      )}
    </section>
  );
}
