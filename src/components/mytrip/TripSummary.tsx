"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { BRAND } from "@/config/brand";
import type { TripSummaryApiResponse } from "@/app/api/trip-summary/route";
import { drawInfographic, type InfographicData } from "@/lib/infographic";
import { resizePhotoForUpload } from "@/lib/resizePhoto";
import type { PhotoUploadApiResponse } from "@/lib/tripPhotos";
import {
  SUMMARY_LABELS,
  dayText,
  fallbackSummaryText,
  formatSummaryDate,
  formatSummaryRange,
  sanitizeSummaryText,
  summaryTextIsStale,
  toSummaryRequest,
  tripStats,
  type SummaryLang,
  type TripSummaryInput,
  type TripSummaryText,
} from "@/lib/tripSummary";

const LANG_STORAGE_KEY = "gettrip4u-summary-lang";
const LOGISTICS_KINDS = new Set(["flight", "drive", "end"]);

function loadLang(): SummaryLang {
  try {
    return window.localStorage.getItem(LANG_STORAGE_KEY) === "en" ? "en" : "he";
  } catch {
    return "he";
  }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "") || "trip";
}

type Day = TripSummaryInput["days"][number];

function dayPhoto(day: Day): string | null {
  return day.stops.find((s) => !s.skipped && s.photoUrl)?.photoUrl ?? null;
}

/** The icons of the day's main activities, without repeats — drawn when the day has no photo. */
function dayIcons(day: Day): string[] {
  const kept = day.stops.filter((s) => !s.skipped);
  const main = kept.filter((s) => !LOGISTICS_KINDS.has(s.kind));
  return [...new Set((main.length > 0 ? main : kept).map((s) => s.icon))].slice(0, 3);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't save the image."))), "image/png"),
  );
}

export function TripSummary({
  input,
  infographicUrl,
  text,
  onSaveInfographic,
  onSaveText,
  onClose,
}: {
  input: TripSummaryInput;
  infographicUrl: string | null;
  text: TripSummaryText | null;
  onSaveInfographic: (url: string | null) => void;
  onSaveText: (text: TripSummaryText) => void;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<SummaryLang>("he");
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const L = SUMMARY_LABELS[lang];
  const rtl = lang === "he";

  useEffect(() => {
    setLang(loadLang());
    setCanShareFiles(
      typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] }),
    );
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function chooseLang(next: SummaryLang) {
    setLang(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // Not remembered — it still switches for now.
    }
  }

  const stats = tripStats(input);
  const statTiles = [
    { value: stats.days, label: L.days },
    { value: stats.activities, label: L.activities },
    { value: stats.flights, label: L.flights },
    { value: stats.stays, label: L.stays },
  ].filter((s, i) => i < 2 || s.value > 0);
  const tagline = text?.[lang].tagline ?? input.trip.subtitle;
  const dayLabel = (i: number) => `${L.day} ${i + 1} · ${formatSummaryDate(input.days[i]!.date, lang)}`;

  // Redraw the created infographic whenever its text, the language or the trip changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!text || !canvas) return;
    const data: InfographicData = {
      lang,
      title: input.trip.name,
      dateRange: formatSummaryRange(input.trip.startDate, input.trip.endDate, lang),
      tagline: text[lang].tagline,
      heroImage: input.trip.heroImage,
      stats: statTiles.map((s) => ({ value: String(s.value), label: s.label })),
      days: input.days.map((day, i) => ({
        label: rtl ? dayLabel(i) : dayLabel(i).toUpperCase(),
        ...dayText(text, input, i, lang),
        photoUrl: dayPhoto(day),
        icons: dayIcons(day),
      })),
      startMonth: Number(input.trip.startDate.slice(5, 7)),
      brand: BRAND.name,
      footer: L.footer,
    };
    let cancelled = false;
    setDrawing(true);
    drawInfographic(canvas, data)
      .catch(() => {
        if (!cancelled) setError(rtl ? "לא הצלחנו לצייר את האינפוגרפיקה." : "Couldn't draw the infographic.");
      })
      .finally(() => {
        if (!cancelled) setDrawing(false);
      });
    return () => {
      cancelled = true;
    };
    // statTiles/dayLabel/L derive from input + lang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, lang, input]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      let image: Blob;
      try {
        // Larger than a trip photo, so the infographic's small text stays readable.
        image = await resizePhotoForUpload(file, 2400, 0.9);
      } catch {
        setError(rtl ? "לא הצלחנו לפתוח את התמונה — נסו תמונה אחרת." : "That image couldn't be opened — try a different one.");
        return;
      }
      const form = new FormData();
      form.append("photo", image, "infographic.jpg");
      const res = await fetch("/api/photo-upload", { method: "POST", body: form });
      const body = (await res.json().catch(() => null)) as PhotoUploadApiResponse | null;
      if (body?.ok) onSaveInfographic(body.url);
      else setError(body?.error.message ?? (rtl ? "ההעלאה נכשלה — נסו שוב." : "Upload failed — try again."));
    } catch {
      setError(rtl ? "ההעלאה נכשלה — בדקו את החיבור ונסו שוב." : "Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    let written: TripSummaryText | null = null;
    try {
      const res = await fetch("/api/trip-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSummaryRequest(input)),
      });
      const body = (await res.json().catch(() => null)) as TripSummaryApiResponse | null;
      if (body?.ok && body.text) written = sanitizeSummaryText(body.text);
    } catch {
      // Offline or the server is unreachable — the names-based text below still makes a full infographic.
    }
    onSaveText(written ?? fallbackSummaryText(input));
    setCreating(false);
  }

  const fileName = `${slugify(input.trip.name)}-infographic-${lang}.png`;

  async function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const url = URL.createObjectURL(await canvasToBlob(canvas));
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError(rtl ? "לא הצלחנו לשמור את התמונה." : "Couldn't save the image.");
    }
  }

  async function handleShare() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const file = new File([await canvasToBlob(canvas)], fileName, { type: "image/png" });
      await navigator.share({ files: [file], title: input.trip.name });
    } catch {
      // The user closed the share sheet — nothing to report.
    }
  }

  const button =
    "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50";
  const primary =
    "flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.99] disabled:opacity-60";

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 px-3 py-4 sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label={L.screenTitle}
    >
      <div dir={rtl ? "rtl" : "ltr"} lang={lang} className="mx-auto max-w-2xl space-y-3">
        <div className="sticky top-2 z-10 flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-xl">
          <h2 className="text-base font-bold text-slate-900">📊 {L.screenTitle}</h2>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-slate-100 p-0.5 text-xs font-semibold" role="group" aria-label="Language">
              {(["he", "en"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => chooseLang(option)}
                  aria-pressed={lang === option}
                  className={`rounded-full px-3 py-1.5 transition-colors ${lang === option ? "bg-white text-brand-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {option === "he" ? "עברית" : "English"}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              aria-label={L.close}
              className="rounded-full px-2.5 py-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              ✕
            </button>
          </div>
        </div>

        <article className="overflow-hidden rounded-xl bg-white shadow-xl">
          <header className="relative flex min-h-48 flex-col justify-end overflow-hidden bg-gradient-to-br from-brand-blue-600 via-brand-blue-500 to-brand-green-500 p-5 text-white">
            {input.trip.heroImage && (
              <>
                <Image src={input.trip.heroImage} alt="" fill sizes="672px" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              </>
            )}
            <div className="relative">
              <h3 dir="auto" className="rtl:text-right text-2xl font-extrabold tracking-tight drop-shadow-sm">{input.trip.name}</h3>
              <p className="mt-0.5 text-sm font-medium text-white/90">
                {formatSummaryRange(input.trip.startDate, input.trip.endDate, lang)}
              </p>
              {tagline && (
                <p dir="auto" className="rtl:text-right mt-1 text-sm text-white/90">
                  {tagline}
                </p>
              )}
            </div>
          </header>

          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
            {statTiles.map((s) => (
              <div key={s.label} className="rounded-xl bg-amber-50 px-3 py-2.5 text-center">
                <p className="text-2xl font-extrabold text-amber-700">{s.value}</p>
                <p className="text-xs font-medium text-amber-900/70">{s.label}</p>
              </div>
            ))}
          </div>

          <section className="space-y-3 border-t border-slate-100 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-blue-600">🖼️ {L.infographic}</h3>

            {error && <p className="text-xs text-red-600">{error}</p>}

            {infographicUrl ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">{L.myInfographic}</p>
                <a href={infographicUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg ring-1 ring-black/5">
                  {/* A plain img: the image keeps its own proportions, whatever they are. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={infographicUrl} alt={L.myInfographic} className="h-auto w-full" />
                </a>
                <div className="flex flex-wrap gap-2">
                  <label className={`${button} cursor-pointer ${uploading ? "pointer-events-none opacity-60" : ""}`}>
                    📷 {uploading ? L.uploading : L.replace}
                    <input type="file" accept="image/*" onChange={(e) => void handleUpload(e)} disabled={uploading} className="sr-only" />
                  </label>
                  <button
                    onClick={() => {
                      if (window.confirm(L.removeConfirm)) onSaveInfographic(null);
                    }}
                    className={button}
                  >
                    🗑️ {L.remove}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {!text && <p className="text-sm text-slate-500">{L.emptyInfographic}</p>}
                <label className={`${primary} cursor-pointer bg-violet-500 hover:bg-violet-600 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
                  📷 {uploading ? L.uploading : L.upload}
                  <input type="file" accept="image/*" onChange={(e) => void handleUpload(e)} disabled={uploading} className="sr-only" />
                </label>
              </>
            )}

            {text ? (
              <div className="space-y-2 pt-2">
                <p className="text-sm font-semibold text-slate-700">{L.created}</p>
                {!text.writtenByAi && <p className="text-[11px] text-slate-400">{L.noAi}</p>}
                {summaryTextIsStale(text, input) && <p className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">{L.stale}</p>}
                <canvas
                  ref={canvasRef}
                  className={`h-auto w-full rounded-lg ring-1 ring-black/5 transition-opacity ${drawing ? "opacity-50" : ""}`}
                />
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void handleDownload()} disabled={drawing} className={button}>
                    ⬇️ {L.download}
                  </button>
                  {canShareFiles && (
                    <button onClick={() => void handleShare()} disabled={drawing} className={button}>
                      📤 {L.share}
                    </button>
                  )}
                  <button onClick={() => void handleCreate()} disabled={creating} className={button}>
                    🔄 {creating ? L.creating : L.recreate}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => void handleCreate()}
                disabled={creating || input.days.length === 0}
                className={`${primary} bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600`}
              >
                {creating ? L.creating : L.create}
              </button>
            )}
          </section>

          <section className="border-t border-slate-100 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-blue-600">📅 {L.dayByDay}</h3>
            <ol className="mt-3 space-y-3">
              {input.days.map((day, i) => {
                const t = dayText(text, input, i, lang);
                return (
                  <li key={day.date} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{dayLabel(i)}</p>
                      <p dir="auto" className="rtl:text-right font-bold leading-snug text-slate-900">
                        {t.title}
                      </p>
                      <p dir="auto" className="rtl:text-right text-sm text-slate-600">
                        {t.summary}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </article>
      </div>
    </div>,
    document.body,
  );
}
