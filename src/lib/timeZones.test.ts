import { describe, expect, it } from "vitest";
import { placeTimeZone, TRIP_TIME_ZONES, tripTimeZoneFields, utcOffsetOn } from "./timeZones";

describe("utcOffsetOn", () => {
  it("follows daylight saving time on the trip's date", () => {
    expect(utcOffsetOn("America/Chicago", "2026-09-30")).toBe("-05:00");
    expect(utcOffsetOn("America/Chicago", "2026-12-15")).toBe("-06:00");
    expect(utcOffsetOn("America/Denver", "2026-09-30")).toBe("-06:00");
    expect(utcOffsetOn("America/Phoenix", "2026-07-01")).toBe("-07:00");
    expect(utcOffsetOn("Asia/Jerusalem", "2026-07-01")).toBe("+03:00");
    expect(utcOffsetOn("Europe/London", "2026-12-15")).toBe("+00:00");
  });
});

describe("placeTimeZone", () => {
  it("knows a weather place's zone when its country has only one", () => {
    expect(placeTimeZone("Tokyo, JP")?.label).toBe("Japan time");
    expect(placeTimeZone("Kyoto, Kyoto Prefecture, JP")?.id).toBe("Asia/Tokyo");
    expect(placeTimeZone("Paris, FR")?.label).toBe("Central European time");
    expect(placeTimeZone("Denver, Colorado, US")).toBeNull();
    expect(placeTimeZone("Somewhere")).toBeNull();
  });

  it("gives Japan time a +09:00 offset", () => {
    expect(utcOffsetOn("Asia/Tokyo", "2026-12-01")).toBe("+09:00");
  });
});

describe("tripTimeZoneFields", () => {
  it("gives the offset at the trip start and the zone's label", () => {
    const central = TRIP_TIME_ZONES.find((z) => z.id === "America/Chicago")!;
    expect(tripTimeZoneFields(central, "2026-09-30")).toEqual({ timezoneOffset: "-05:00", timezoneLabel: "Central time" });
  });
});
