/**
 * The shareable itinerary: turns a trip as the user sees it (built-in
 * itinerary + their edits + activities they added) into a document model
 * that renders both as a printable/PDF page and as plain text for
 * messages. One model, two outputs, so they can't drift apart.
 *
 * Sharing means the document leaves the app, so the sensitive parts —
 * booking details (confirmation codes, phone numbers, costs) and the
 * user's own notes — are opt-in options, off by default.
 */
import { formatDateUS } from "@/lib/format";
import { flightLabel, flightRoute, type Flight } from "@/lib/flights";
import { formatWallClock } from "@/lib/flightImpact";
import type { WeatherCondition } from "@/lib/types";
import { weatherSummary } from "@/lib/weatherLabels";

export interface ItineraryOptions {
  /** Confirmation codes, phone numbers, costs. */
  includeBookingDetails: boolean;
  /** The user's own notes on activities. */
  includeNotes: boolean;
  includeWeather: boolean;
  includePhotos: boolean;
}

export const DEFAULT_ITINERARY_OPTIONS: ItineraryOptions = {
  includeBookingDetails: false,
  includeNotes: false,
  includeWeather: true,
  includePhotos: true,
};

export interface ItineraryStopInput {
  id: string;
  title: string;
  timeLabel: string;
  icon: string;
  /** "hotel" marks a place to stay; anything else is just an activity. */
  kind: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  confirmation?: string | null;
  cost?: string | null;
  tip?: string | null;
  warning?: string | null;
  personalNote?: string | null;
  photoUrl?: string | null;
  photoCaption?: string | null;
  flight: Flight | null;
}

export interface ItineraryInput {
  trip: { name: string; subtitle: string; startDate: string; endDate: string; heroImage: string | null; heroCaption: string | null };
  days: {
    dayLabel: string;
    title: string;
    routeUrl: string | null;
    weather: { name: string; weather: WeatherCondition | null }[];
    stops: ItineraryStopInput[];
  }[];
  /** True when the forecasts are estimates from a demo source — they're left out rather than presented as real. */
  weatherIsEstimate: boolean;
}

export interface ItineraryLine {
  icon: string;
  /** Short label like "Tip" — omitted for plain text lines. */
  label?: string;
  text: string;
  tone?: "warning" | "tip" | "note";
}

export interface ItineraryEntry {
  id: string;
  time: string;
  icon: string;
  title: string;
  lines: ItineraryLine[];
  photo: { url: string; caption: string | null } | null;
}

export interface ItineraryDay {
  label: string;
  title: string;
  weather: string[];
  routeUrl: string | null;
  entries: ItineraryEntry[];
}

export interface ItineraryDoc {
  title: string;
  subtitle: string;
  dateRange: string;
  dayCount: number;
  heroImage: string | null;
  heroCaption: string | null;
  flights: { day: string; date: string; label: string; route: string | null; time: string | null }[];
  stays: { name: string; day: string }[];
  days: ItineraryDay[];
  options: ItineraryOptions;
}

function entryLines(stop: ItineraryStopInput, options: ItineraryOptions): ItineraryLine[] {
  const lines: ItineraryLine[] = [];

  if (stop.flight) {
    const route = flightRoute(stop.flight);
    const arrives = stop.flight.scheduledArrival ? ` · Arrives ${formatWallClock(stop.flight.scheduledArrival)}` : "";
    lines.push({ icon: "✈️", label: "Flight", text: `${flightLabel(stop.flight)}${route ? ` · ${route}` : ""}${arrives}` });
  }
  if (stop.description) lines.push({ icon: "", text: stop.description });
  if (stop.address) lines.push({ icon: "📍", text: stop.address });
  if (options.includeBookingDetails) {
    if (stop.phone) lines.push({ icon: "📞", text: stop.phone });
    if (stop.confirmation) lines.push({ icon: "🎟️", text: stop.confirmation });
    if (stop.cost) lines.push({ icon: "💰", text: stop.cost });
  }
  if (stop.tip) lines.push({ icon: "💡", label: "Tip", text: stop.tip, tone: "tip" });
  if (stop.warning) lines.push({ icon: "⚠️", label: "Important", text: stop.warning, tone: "warning" });
  if (options.includeNotes && stop.personalNote) lines.push({ icon: "📝", label: "Note", text: stop.personalNote, tone: "note" });
  return lines;
}

export function buildItinerary(input: ItineraryInput, options: ItineraryOptions): ItineraryDoc {
  const flights: ItineraryDoc["flights"] = [];
  const stays: ItineraryDoc["stays"] = [];

  const days = input.days.map((day): ItineraryDay => {
    const weather =
      options.includeWeather && !input.weatherIsEstimate
        ? day.weather.filter((w) => w.weather !== null).map((w) => `${w.name}: ${weatherSummary(w.weather!)}`)
        : [];

    const entries = day.stops.map((stop): ItineraryEntry => {
      if (stop.flight) {
        flights.push({
          day: day.dayLabel,
          date: formatDateUS(stop.flight.flightDate),
          label: flightLabel(stop.flight),
          route: flightRoute(stop.flight),
          time: stop.timeLabel,
        });
      }
      if (stop.kind === "hotel" && !stays.some((s) => s.name === stop.title)) stays.push({ name: stop.title, day: day.dayLabel });

      return {
        id: stop.id,
        time: stop.timeLabel,
        icon: stop.icon,
        title: stop.title,
        lines: entryLines(stop, options),
        photo: options.includePhotos && stop.photoUrl ? { url: stop.photoUrl, caption: stop.photoCaption ?? null } : null,
      };
    });

    return { label: day.dayLabel, title: day.title, weather, routeUrl: day.routeUrl, entries };
  });

  return {
    title: input.trip.name,
    subtitle: input.trip.subtitle,
    dateRange: `${formatDateUS(input.trip.startDate)} → ${formatDateUS(input.trip.endDate)}`,
    dayCount: input.days.length,
    heroImage: input.trip.heroImage,
    heroCaption: input.trip.heroCaption,
    flights,
    stays,
    days,
    options,
  };
}

/** Plain-text version for messages and email — same content as the printable page. */
export function itineraryToText(doc: ItineraryDoc): string {
  const out: string[] = [];
  out.push(doc.title.toUpperCase());
  out.push(`🗓️ ${doc.dateRange} · ${doc.dayCount} day${doc.dayCount === 1 ? "" : "s"}`);
  if (doc.subtitle) out.push(doc.subtitle);

  if (doc.flights.length > 0) {
    out.push("", "✈️ FLIGHTS");
    for (const f of doc.flights) out.push(`• ${f.date} · ${f.label}${f.route ? ` · ${f.route}` : ""}${f.time ? ` · ${f.time}` : ""}`);
  }
  if (doc.stays.length > 0) {
    out.push("", "🏨 WHERE YOU'LL STAY");
    for (const s of doc.stays) out.push(`• ${s.name} (${s.day})`);
  }

  for (const day of doc.days) {
    out.push("", "━━━━━━━━━━━━━━━━━━━━", `📅 ${day.label.toUpperCase()}${day.title ? ` — ${day.title}` : ""}`);
    for (const w of day.weather) out.push(`🌤️ Weather · ${w}`);
    if (day.routeUrl) out.push(`🗺️ Day route: ${day.routeUrl}`);
    if (day.entries.length === 0) out.push("(Nothing planned yet)");

    for (const entry of day.entries) {
      out.push("", `${entry.time} ${entry.icon} ${entry.title}`);
      for (const line of entry.lines) {
        const text = line.label ? `${line.label}: ${line.text}` : line.text;
        out.push(`   ${line.icon ? `${line.icon} ` : ""}${text}`);
      }
    }
  }

  out.push("", "Made with BuildTripForYou");
  return out.join("\n");
}
