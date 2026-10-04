import { describe, expect, it } from "vitest";
import { wrapText } from "@/lib/infographic";
import {
  dayText,
  fallbackSummaryText,
  formatSummaryDate,
  sanitizeSummaryText,
  summaryTextIsStale,
  toSummaryRequest,
  tripStats,
  type TripSummaryInput,
} from "@/lib/tripSummary";

const stop = (title: string, kind: string, extra: Partial<TripSummaryInput["days"][number]["stops"][number]> = {}) => ({
  title,
  kind,
  icon: "📍",
  photoUrl: null,
  skipped: false,
  isFlight: kind === "flight",
  ...extra,
});

const input: TripSummaryInput = {
  trip: { name: "Colorado in the Fall", subtitle: "", startDate: "2026-09-27", endDate: "2026-09-28", heroImage: null },
  days: [
    {
      date: "2026-09-27",
      title: "",
      stops: [
        stop("Flight AA 1523 — DFW → DEN", "flight"),
        stop("Land in Denver", "flight", { isFlight: false }),
        stop("Check in — TownePlace Suites", "hotel"),
        stop("Manitou Incline", "activity"),
        stop("Garden of the Gods", "activity", { skipped: true }),
      ],
    },
    { date: "2026-09-28", title: "Breckenridge", stops: [] },
  ],
};

describe("tripStats", () => {
  it("counts days, activities, flights and places to stay, leaving out skipped ones", () => {
    expect(tripStats(input)).toEqual({ days: 2, activities: 1, flights: 1, stays: 1 });
  });
});

describe("fallbackSummaryText", () => {
  it("builds a title and summary per day from the activity names, without the travel legs or skipped activities", () => {
    const text = fallbackSummaryText(input);
    expect(text.writtenByAi).toBe(false);
    expect(text.en.days[0]).toEqual({
      title: "Check in — TownePlace Suites · Manitou Incline",
      summary: "Check in — TownePlace Suites · Manitou Incline",
    });
    expect(text.en.days[1]).toEqual({ title: "Breckenridge", summary: "Nothing planned yet" });
    expect(text.he.days[1]?.summary).toBe("עוד לא תוכנן");
  });
});

describe("sanitizeSummaryText", () => {
  it("keeps well-formed text and clips overly long fields", () => {
    const text = sanitizeSummaryText({
      he: { tagline: "טיול", days: [{ title: "יום", summary: "x".repeat(400) }] },
      en: { tagline: "Trip", days: [{ title: "Day", summary: "ok" }] },
      writtenByAi: true,
    });
    expect(text?.writtenByAi).toBe(true);
    expect(text?.he.days[0]?.summary.length).toBe(300);
  });

  it("rejects malformed text", () => {
    expect(sanitizeSummaryText(null)).toBeNull();
    expect(sanitizeSummaryText({ he: { tagline: "a", days: [] } })).toBeNull();
    expect(sanitizeSummaryText({ he: { tagline: "a", days: [{ title: 1 }] }, en: { tagline: "b", days: [] } })).toBeNull();
  });
});

describe("dayText / summaryTextIsStale", () => {
  it("falls back for a day added after the text was written, and flags the text as stale", () => {
    const text = sanitizeSummaryText({
      he: { tagline: "", days: [{ title: "א", summary: "ב" }] },
      en: { tagline: "", days: [{ title: "A", summary: "B" }] },
    });
    expect(dayText(text, input, 0, "en")).toEqual({ title: "A", summary: "B" });
    expect(dayText(text, input, 1, "en").title).toBe("Breckenridge");
    expect(summaryTextIsStale(text, input)).toBe(true);
    expect(summaryTextIsStale(fallbackSummaryText(input), input)).toBe(false);
  });
});

describe("toSummaryRequest", () => {
  it("sends only names and dates, without skipped activities", () => {
    const request = toSummaryRequest(input);
    expect(request.days[0]?.activities).toEqual([
      "Flight AA 1523 — DFW → DEN",
      "Land in Denver",
      "Check in — TownePlace Suites",
      "Manitou Incline",
    ]);
    expect(JSON.stringify(request)).not.toContain("photoUrl");
  });
});

describe("formatSummaryDate", () => {
  it("keeps the calendar date in any time zone", () => {
    expect(formatSummaryDate("2026-09-27", "en")).toBe("Sun, Sep 27");
    expect(formatSummaryDate("2026-09-27", "he")).toContain("27");
  });
});

describe("wrapText", () => {
  const measure = (s: string) => s.length * 10;

  it("wraps words to fit the width", () => {
    expect(wrapText(measure, "one two three four", 90, 3)).toEqual(["one two", "three", "four"]);
  });

  it("cuts to the line limit with an ellipsis", () => {
    const lines = wrapText(measure, "one two three four five six", 90, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1]?.endsWith("…")).toBe(true);
    expect(measure(lines[1]!)).toBeLessThanOrEqual(90);
  });
});

describe("wrapText with no-break spaces", () => {
  it("keeps a word and its following separator on one line", () => {
    const measure = (s: string) => s.length * 10;
    expect(wrapText(measure, "aaa · bbb · ccc", 80, 3)).toEqual(["aaa ·", "bbb ·", "ccc"]);
  });
});
