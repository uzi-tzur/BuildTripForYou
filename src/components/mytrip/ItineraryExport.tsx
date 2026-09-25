"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  DEFAULT_ITINERARY_OPTIONS,
  buildItinerary,
  itineraryToText,
  type ItineraryDoc,
  type ItineraryInput,
  type ItineraryLine,
  type ItineraryOptions,
} from "@/lib/itinerary";

const TONE_CLASS: Record<NonNullable<ItineraryLine["tone"]>, string> = {
  tip: "bg-brand-blue-50 text-brand-blue-900",
  warning: "bg-amber-50 text-amber-900",
  note: "bg-violet-50 text-violet-900",
};

function Line({ line }: { line: ItineraryLine }) {
  return (
    <p className={`text-[13px] leading-relaxed ${line.tone ? `rounded-md px-2 py-1 ${TONE_CLASS[line.tone]}` : "text-slate-600"}`}>
      {line.icon && <span className="mr-1.5">{line.icon}</span>}
      {line.label && <span className="mr-1 font-semibold">{line.label}:</span>}
      <span className="whitespace-pre-wrap">{line.text}</span>
    </p>
  );
}

function ItineraryDocument({ doc }: { doc: ItineraryDoc }) {
  return (
    <article className="itinerary-doc overflow-hidden rounded-xl bg-white shadow-xl print:rounded-none print:shadow-none">
      <header className="relative bg-gradient-to-br from-brand-blue-600 via-brand-blue-500 to-brand-green-500 px-7 pb-6 pt-8 text-white">
        {doc.heroImage && (
          <div className="relative -mx-7 -mt-8 mb-5 h-44 overflow-hidden">
            <Image src={doc.heroImage} alt="" fill priority loading="eager" sizes="768px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-blue-700/70 to-transparent" />
          </div>
        )}
        <h1 className="text-3xl font-extrabold tracking-tight">{doc.title}</h1>
        <p className="mt-1 text-sm font-medium text-white/90">
          🗓️ {doc.dateRange} · {doc.dayCount} day{doc.dayCount === 1 ? "" : "s"}
        </p>
        {doc.subtitle && <p className="mt-2 text-sm text-white/90">{doc.subtitle}</p>}
      </header>

      {(doc.flights.length > 0 || doc.stays.length > 0) && (
        <section className="grid gap-4 border-b border-slate-100 px-7 py-5 sm:grid-cols-2 print:grid-cols-2 print:break-inside-avoid">
          {doc.flights.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-blue-600">✈️ Flights</h2>
              <ul className="mt-2 space-y-1.5 text-[13px] text-slate-700">
                {doc.flights.map((f, i) => (
                  <li key={i}>
                    <span className="font-semibold">{f.label}</span>
                    {f.route && <span> · {f.route}</span>}
                    <span className="block text-slate-500">
                      {f.date}
                      {f.time && ` · ${f.time}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {doc.stays.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-blue-600">🏨 Where you&apos;ll stay</h2>
              <ul className="mt-2 space-y-1.5 text-[13px] text-slate-700">
                {doc.stays.map((s, i) => (
                  <li key={i}>
                    <span className="font-semibold">{s.name}</span>
                    <span className="block text-slate-500">{s.day}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <div className="space-y-7 px-7 py-6">
        {doc.days.map((day) => (
          <section key={day.label}>
            <div className="rounded-lg bg-brand-blue-50 px-4 py-2.5 print:break-after-avoid">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-brand-blue-700">📅 {day.label}</h2>
              {day.title && <p className="text-[15px] font-semibold text-slate-900">{day.title}</p>}
            </div>

            {(day.weather.length > 0 || day.routeUrl) && (
              <div className="mt-2 space-y-1 px-1 text-[13px] text-slate-600 print:break-after-avoid">
                {day.weather.map((w) => (
                  <p key={w}>
                    <span className="mr-1.5">🌤️</span>
                    <span className="font-semibold">Weather</span> · {w}
                  </p>
                ))}
                {day.routeUrl && (
                  <p>
                    <span className="mr-1.5">🗺️</span>
                    <a href={day.routeUrl} className="font-semibold text-brand-blue-600 underline">
                      Day route in Google Maps
                    </a>
                  </p>
                )}
              </div>
            )}

            {day.entries.length === 0 ? (
              <p className="mt-3 px-1 text-sm text-slate-400">Nothing planned yet.</p>
            ) : (
              <ol className="mt-3 divide-y divide-slate-100">
                {day.entries.map((entry) => (
                  <li key={entry.id} className="grid grid-cols-[6.5rem_1fr] gap-3 py-3 print:break-inside-avoid">
                    <p className="pt-0.5 text-xs font-semibold text-slate-500">{entry.time}</p>
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-[15px] font-bold leading-snug text-slate-900">
                        <span className="mr-1.5">{entry.icon}</span>
                        {entry.title}
                      </p>
                      {entry.lines.map((line, i) => (
                        <Line key={i} line={line} />
                      ))}
                      {entry.photo && (
                        <div>
                          <div className="relative h-36 w-full overflow-hidden rounded-lg">
                            <Image src={entry.photo.url} alt="" fill loading="eager" sizes="500px" className="object-cover" />
                          </div>
                          {entry.photo.caption && <p className="mt-1 text-[10px] text-slate-400">{entry.photo.caption}</p>}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>

      <footer className="border-t border-slate-100 px-7 py-4 text-center text-[11px] text-slate-400">Made with BuildTripForYou</footer>
    </article>
  );
}

const OPTION_LABELS: { key: keyof ItineraryOptions; label: string; hint?: string }[] = [
  { key: "includeWeather", label: "🌤️ Weather forecasts" },
  { key: "includePhotos", label: "🖼️ Photos" },
  { key: "includeBookingDetails", label: "🎟️ Booking details", hint: "confirmation codes, phone numbers, costs" },
  { key: "includeNotes", label: "📝 My personal notes" },
];

export function ItineraryExport({ input, onClose }: { input: ItineraryInput; onClose: () => void }) {
  const [options, setOptions] = useState<ItineraryOptions>(DEFAULT_ITINERARY_OPTIONS);
  const [status, setStatus] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  const doc = useMemo(() => buildItinerary(input, options), [input, options]);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
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

  function flash(message: string) {
    setStatus(message);
    setTimeout(() => setStatus(null), 2500);
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(itineraryToText(doc));
      flash("Copied — paste it into a message or email.");
    } catch {
      flash("Couldn't copy automatically — use Print / Save as PDF instead.");
    }
  }

  async function shareText() {
    try {
      await navigator.share({ title: doc.title, text: itineraryToText(doc) });
    } catch {
      // The user closed the share sheet — nothing to report.
    }
  }

  return createPortal(
    <div
      className="itinerary-print-root fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 px-3 py-4 sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Export itinerary"
    >
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="sticky top-2 z-10 space-y-3 rounded-xl bg-white p-4 shadow-xl print:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">📄 Export itinerary</h2>
              <p className="text-xs text-slate-500">Choose what to include, then print or save it as a PDF, or send it as text.</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="rounded-full px-2.5 py-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
              ✕
            </button>
          </div>

          <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {OPTION_LABELS.map(({ key, label, hint }) => (
              <label key={key} className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={(e) => setOptions((prev) => ({ ...prev, [key]: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-blue-600"
                />
                <span>
                  {label}
                  {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
                </span>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => window.print()}
              className="rounded-full bg-brand-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-blue-600 active:scale-95"
            >
              🖨️ Print / Save as PDF
            </button>
            {canShare && (
              <button
                onClick={() => void shareText()}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                📤 Share
              </button>
            )}
            <button
              onClick={() => void copyText()}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              📋 Copy as text
            </button>
            {status && <span className="text-xs font-medium text-brand-green-700">{status}</span>}
          </div>
        </div>

        <ItineraryDocument doc={doc} />
      </div>
    </div>,
    document.body,
  );
}
