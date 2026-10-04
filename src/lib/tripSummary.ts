/**
 * The trip summary screen: a recap of the trip plus an infographic — either
 * an image the user uploaded (e.g. one made in NotebookLM) or one the app
 * draws itself (src/lib/infographic.ts) from the trip's days and short day
 * summaries written by Claude (src/app/api/trip-summary/route.ts).
 *
 * Both are stored as a trip-level entry in the per-trip stop overrides (key
 * TRIP_SUMMARY_KEY, same idea as the packing checklist), so they're saved on
 * the device, synced to the cloud and included in backups with no schema change.
 */
import { z } from "zod";

/** Can't collide with a stop id (`${date}-${index}`), a day entry (`day${index}`) or the checklist ("prep"). */
export const TRIP_SUMMARY_KEY = "summary";

export type SummaryLang = "he" | "en";

export interface SummaryDayText {
  /** A few words, e.g. "Manitou Incline & Garden of the Gods". */
  title: string;
  /** One or two short sentences. */
  summary: string;
}

export interface SummaryText {
  /** One line under the trip name, e.g. "4 days of aspen gold and mountain air". */
  tagline: string;
  days: SummaryDayText[];
}

/** The written text in both languages, one entry per trip day, in day order. */
export interface TripSummaryText {
  he: SummaryText;
  en: SummaryText;
  /** False when Claude wasn't reachable and the text was put together from the activity names instead. */
  writtenByAi: boolean;
}

/** What the summary screen needs to know about the trip — the trip as the user sees it, including their edits. */
export interface TripSummaryInput {
  trip: { name: string; subtitle: string; startDate: string; endDate: string; heroImage: string | null };
  days: {
    date: string;
    title: string;
    /** `isFlight` marks an actual flight (with a flight number) — not a step like "Land in Denver". */
    stops: { title: string; kind: string; icon: string; photoUrl: string | null; skipped: boolean; isFlight: boolean }[];
  }[];
}

export const MAX_SUMMARY_DAYS = 60;
export const MAX_DAY_TITLE = 80;
export const MAX_DAY_SUMMARY = 300;
export const MAX_TAGLINE = 150;

const dayTextSchema = z.object({
  title: z.string().describe("A few words naming the day's highlights"),
  summary: z.string().describe("One or two short sentences about the day"),
});

const textSchema = z.object({
  tagline: z.string().describe("One short, warm line about the whole trip"),
  days: z.array(dayTextSchema),
});

/** What Claude is asked to return — also used to check the response before it's trusted. */
export const summaryTextSchema = z.object({ he: textSchema, en: textSchema });

/** The request body for /api/trip-summary: only what's needed to write the text — no confirmation codes, phone numbers or notes. */
export const summaryRequestSchema = z.object({
  name: z.string().max(200),
  startDate: z.string().max(20),
  endDate: z.string().max(20),
  days: z
    .array(
      z.object({
        date: z.string().max(20),
        title: z.string().max(200),
        activities: z.array(z.string().max(200)).max(60),
      }),
    )
    .min(1)
    .max(MAX_SUMMARY_DAYS),
});

export type SummaryRequest = z.infer<typeof summaryRequestSchema>;

/** Kinds that are getting somewhere rather than doing something — left out of the "highlights". */
const LOGISTICS_KINDS = new Set(["flight", "drive", "end"]);

function highlights(day: TripSummaryInput["days"][number]): string[] {
  const kept = day.stops.filter((s) => !s.skipped);
  const main = kept.filter((s) => !LOGISTICS_KINDS.has(s.kind));
  return (main.length > 0 ? main : kept).map((s) => s.title);
}

export function toSummaryRequest(input: TripSummaryInput): SummaryRequest {
  return {
    name: input.trip.name.slice(0, 200),
    startDate: input.trip.startDate,
    endDate: input.trip.endDate,
    days: input.days.slice(0, MAX_SUMMARY_DAYS).map((day) => ({
      date: day.date,
      title: day.title.slice(0, 200),
      activities: day.stops
        .filter((s) => !s.skipped)
        .slice(0, 60)
        .map((s) => s.title.slice(0, 200)),
    })),
  };
}

/** The "·" is glued to the name before it (no-break space), so a wrapped line never starts with one. */
const SEPARATOR = "\u00A0· ";

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Text put together from the activity names — used when Claude isn't available, and for days added after the text was written. */
export function fallbackDayText(day: TripSummaryInput["days"][number], lang: SummaryLang): SummaryDayText {
  const names = highlights(day);
  const title = day.title || names.slice(0, 2).join(SEPARATOR) || (lang === "he" ? "יום חופשי" : "Free day");
  const summary = names.length > 0 ? names.slice(0, 4).join(SEPARATOR) : lang === "he" ? "עוד לא תוכנן" : "Nothing planned yet";
  return { title: clip(title, MAX_DAY_TITLE), summary: clip(summary, MAX_DAY_SUMMARY) };
}

export function fallbackSummaryText(input: TripSummaryInput): TripSummaryText {
  const n = input.days.length;
  const build = (lang: SummaryLang): SummaryText => ({
    tagline: input.trip.subtitle || (lang === "he" ? `${n} ימים של טיול` : `${n} day${n === 1 ? "" : "s"} on the road`),
    days: input.days.map((day) => fallbackDayText(day, lang)),
  });
  return { he: build("he"), en: build("en"), writtenByAi: false };
}

/** The text for one day in one language — the saved text when there is some for that day, otherwise the fallback. */
export function dayText(
  text: TripSummaryText | null,
  input: TripSummaryInput,
  dayIndex: number,
  lang: SummaryLang,
): SummaryDayText {
  return text?.[lang].days[dayIndex] ?? fallbackDayText(input.days[dayIndex]!, lang);
}

/** True when days were added or removed after the text was written. */
export function summaryTextIsStale(text: TripSummaryText | null, input: TripSummaryInput): boolean {
  return text !== null && text.en.days.length !== input.days.length;
}

function sanitizeText(value: unknown): SummaryText | null {
  if (!value || typeof value !== "object") return null;
  const { tagline, days } = value as Record<string, unknown>;
  if (typeof tagline !== "string" || !Array.isArray(days)) return null;
  const cleanDays: SummaryDayText[] = [];
  for (const raw of days.slice(0, MAX_SUMMARY_DAYS)) {
    if (!raw || typeof raw !== "object") return null;
    const { title, summary } = raw as Record<string, unknown>;
    if (typeof title !== "string" || typeof summary !== "string") return null;
    cleanDays.push({ title: clip(title.trim(), MAX_DAY_TITLE), summary: clip(summary.trim(), MAX_DAY_SUMMARY) });
  }
  return { tagline: clip(tagline.trim(), MAX_TAGLINE), days: cleanDays };
}

/** Rebuilds the saved text from untrusted data (cloud row, backup file, API response), or null if it's malformed. */
export function sanitizeSummaryText(value: unknown): TripSummaryText | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const he = sanitizeText(raw.he);
  const en = sanitizeText(raw.en);
  if (!he || !en) return null;
  return { he, en, writtenByAi: raw.writtenByAi === true };
}

export interface TripStats {
  days: number;
  activities: number;
  flights: number;
  stays: number;
}

export function tripStats(input: TripSummaryInput): TripStats {
  const stops = input.days.flatMap((d) => d.stops).filter((s) => !s.skipped);
  return {
    days: input.days.length,
    activities: stops.filter((s) => !LOGISTICS_KINDS.has(s.kind) && s.kind !== "hotel").length,
    flights: stops.filter((s) => s.isFlight).length,
    stays: new Set(stops.filter((s) => s.kind === "hotel").map((s) => s.title)).size,
  };
}

/** "Sun, Sep 27" / "27 בספט׳" (Hebrew leaves out the weekday, which would repeat the "יום" of "יום 1") — date-only, so no time zone can shift it to another day. */
export function formatSummaryDate(date: string, lang: SummaryLang): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(lang === "he" ? "he-IL" : "en-US", {
    weekday: lang === "he" ? undefined : "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatSummaryRange(startDate: string, endDate: string, lang: SummaryLang): string {
  const fmt = (date: string) => {
    const [y, m, d] = date.split("-").map(Number) as [number, number, number];
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(lang === "he" ? "he-IL" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

export const SUMMARY_LABELS = {
  he: {
    screenTitle: "סיכום הטיול",
    close: "סגירה",
    days: "ימים",
    activities: "פעילויות",
    flights: "טיסות",
    stays: "מקומות לינה",
    day: "יום",
    infographic: "אינפוגרפיקה",
    myInfographic: "האינפוגרפיקה שלי",
    upload: "העלאת תמונה מהמחשב או מהנייד",
    uploading: "מעלה…",
    replace: "החלפה",
    remove: "הסרה",
    create: "✨ יצירת אינפוגרפיקה",
    creating: "יוצר…",
    recreate: "יצירה מחדש",
    download: "שמירה כתמונה",
    share: "שיתוף",
    created: "אינפוגרפיקה שנוצרה",
    noAi: "נכתב משמות הפעילויות (בינה מלאכותית לא מחוברת)",
    stale: "ימים נוספו או הוסרו מאז שהטקסט נכתב — לחצו על יצירה מחדש לעדכון.",
    dayByDay: "יום אחר יום",
    emptyInfographic: "הוסיפו תמונת אינפוגרפיקה משלכם, או צרו אחת מתוך הטיול.",
    removeConfirm: "להסיר את האינפוגרפיקה?",
    footer: "תכננו. חוו. תיהנו.",
  },
  en: {
    screenTitle: "Trip summary",
    close: "Close",
    days: "days",
    activities: "activities",
    flights: "flights",
    stays: "places to stay",
    day: "Day",
    infographic: "Infographic",
    myInfographic: "My infographic",
    upload: "Upload an image from computer or phone",
    uploading: "Uploading…",
    replace: "Replace",
    remove: "Remove",
    create: "✨ Create infographic",
    creating: "Creating…",
    recreate: "Recreate",
    download: "Save as image",
    share: "Share",
    created: "Created infographic",
    noAi: "Written from the activity names (AI not connected)",
    stale: "Days were added or removed since this was written — tap Recreate to update it.",
    dayByDay: "Day by day",
    emptyInfographic: "Add your own infographic image, or create one from the trip.",
    removeConfirm: "Remove this infographic?",
    footer: "Plan it. Experience it. Enjoy it.",
  },
} satisfies Record<SummaryLang, Record<string, string>>;
