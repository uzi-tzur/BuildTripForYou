import { describe, expect, it } from "vitest";
import { getTripDays, type TripMeta } from "@/lib/trips";
import { isWithinForecastWindow, toWeatherPlace } from "@/lib/weatherPlace";

const TOKYO = { name: "Tokyo, JP", latitude: 35.68, longitude: 139.76 };

const blankTrip: TripMeta = {
  id: "tokyo-1",
  name: "Tokyo",
  subtitle: "",
  startDate: "2026-12-01",
  endDate: "2026-12-03",
  heroImage: null,
  heroCaption: null,
  timezoneOffset: "+09:00",
  timezoneLabel: "Japan time",
  isSeed: false,
  createdAt: "2026-11-01T00:00:00.000Z",
};

describe("trip weather location", () => {
  it("gives every day of a blank trip the chosen place, and none before one is chosen", () => {
    expect(getTripDays(blankTrip).every((d) => d.weatherLocations.length === 0)).toBe(true);
    const days = getTripDays({ ...blankTrip, weatherLocation: TOKYO });
    expect(days).toHaveLength(3);
    expect(days.every((d) => d.weatherLocations[0]?.name === "Tokyo, JP")).toBe(true);
  });

  it("accepts only well-formed places", () => {
    expect(toWeatherPlace(TOKYO)).toEqual(TOKYO);
    expect(toWeatherPlace(null)).toBeNull();
    expect(toWeatherPlace({ name: "", latitude: 1, longitude: 1 })).toBeNull();
    expect(toWeatherPlace({ name: "X", latitude: 91, longitude: 1 })).toBeNull();
    expect(toWeatherPlace({ name: "X", latitude: "1", longitude: 1 })).toBeNull();
  });

  it("asks for a forecast only from yesterday to 5 days ahead", () => {
    const today = new Date("2026-11-26T15:00:00Z");
    expect(isWithinForecastWindow("2026-11-25", today)).toBe(true);
    expect(isWithinForecastWindow("2026-12-01", today)).toBe(true);
    expect(isWithinForecastWindow("2026-12-02", today)).toBe(false);
    expect(isWithinForecastWindow("2026-11-24", today)).toBe(false);
  });
});
