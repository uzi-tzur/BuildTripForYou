import { describe, expect, it } from "vitest";
import { buildFlight } from "@/lib/flights";
import { DEFAULT_ITINERARY_OPTIONS, buildItinerary, itineraryToText, type ItineraryInput } from "@/lib/itinerary";
import type { WeatherCondition } from "@/lib/types";

const weather: WeatherCondition = {
  id: "w",
  location: "x",
  latitude: 0,
  longitude: 0,
  observedAt: "",
  forecastFor: null,
  temperatureC: 15,
  temperatureMinC: 8,
  temperatureMaxC: 21,
  conditionSummary: "Clear",
  precipitationChance: 20,
  precipitationWindows: null,
  windSpeedKph: 5,
  provider: "openweathermap",
};

const flight = buildFlight({
  date: "2026-09-27",
  time: "2026-09-27T07:05:00-05:00",
  flight: { airline: "AA", flightNumber: "1523", departureAirport: "DFW", arrivalAirport: "DEN", arrivalClock: "08:10:00-06:00" },
});

const input: ItineraryInput = {
  trip: { name: "Colorado in the Fall", subtitle: "Aspen gold", startDate: "2026-09-27", endDate: "2026-09-30", heroImage: null, heroCaption: null },
  weatherIsEstimate: false,
  days: [
    {
      dayLabel: "Day 1 · Sunday, Sep 27",
      title: "Departure",
      routeUrl: "https://www.google.com/maps/dir/a/b",
      weather: [{ name: "Colorado Springs", weather }],
      stops: [
        {
          id: "f",
          title: "Flight AA 1523 — DFW → DEN",
          timeLabel: "7:05 AM (Dallas time)",
          icon: "✈️",
          kind: "flight",
          confirmation: "Confirmation code: SBLIQA",
          personalNote: "Take cash",
          flight,
        },
        {
          id: "h",
          title: "Check in — TownePlace Suites",
          timeLabel: "12:30 PM",
          icon: "🏨",
          kind: "hotel",
          address: "4760 Centennial Blvd",
          phone: "719-555-0100",
          cost: "27,000 points",
          tip: "Free cancellation until Sep 25",
          warning: "Timed reservation required",
          photoUrl: "https://images.pexels.com/photos/1/x.jpeg",
          flight: null,
        },
      ],
    },
  ],
};

describe("buildItinerary", () => {
  it("keeps booking details and personal notes out by default, since the document gets shared", () => {
    const text = itineraryToText(buildItinerary(input, DEFAULT_ITINERARY_OPTIONS));
    expect(text).not.toContain("SBLIQA");
    expect(text).not.toContain("719-555-0100");
    expect(text).not.toContain("27,000 points");
    expect(text).not.toContain("Take cash");
    expect(text).toContain("Free cancellation until Sep 25");
    expect(text).toContain("Timed reservation required");
  });

  it("includes them when asked", () => {
    const text = itineraryToText(buildItinerary(input, { ...DEFAULT_ITINERARY_OPTIONS, includeBookingDetails: true, includeNotes: true }));
    expect(text).toContain("SBLIQA");
    expect(text).toContain("719-555-0100");
    expect(text).toContain("Take cash");
  });

  it("uses the relevant icons and the MM-DD-YYYY date format", () => {
    const text = itineraryToText(buildItinerary(input, DEFAULT_ITINERARY_OPTIONS));
    expect(text).toContain("🗓️ 09-27-2026 → 09-30-2026 · 1 day");
    expect(text).toContain("✈️ FLIGHTS");
    expect(text).toContain("• 09-27-2026 · AA 1523 · DFW → DEN");
    expect(text).toContain("🏨 WHERE YOU'LL STAY");
    expect(text).toContain("🌤️ Weather · Colorado Springs: 46°–70°F · Precipitation 20%");
    expect(text).toContain("✈️ Flight: AA 1523 · DFW → DEN · Arrives 8:10 AM");
    expect(text).toContain("📍 4760 Centennial Blvd");
    expect(text).toContain("💡 Tip:");
    expect(text).toContain("⚠️ Important:");
    expect(text).toContain("🗺️ Day route: https://www.google.com/maps/dir/a/b");
  });

  it("leaves weather out when it's only an estimate, and when turned off", () => {
    expect(itineraryToText(buildItinerary({ ...input, weatherIsEstimate: true }, DEFAULT_ITINERARY_OPTIONS))).not.toContain("🌤️");
    expect(itineraryToText(buildItinerary(input, { ...DEFAULT_ITINERARY_OPTIONS, includeWeather: false }))).not.toContain("🌤️");
  });

  it("only attaches photos when enabled", () => {
    expect(buildItinerary(input, DEFAULT_ITINERARY_OPTIONS).days[0]!.entries[1]!.photo).not.toBeNull();
    expect(buildItinerary(input, { ...DEFAULT_ITINERARY_OPTIONS, includePhotos: false }).days[0]!.entries[1]!.photo).toBeNull();
  });
});
