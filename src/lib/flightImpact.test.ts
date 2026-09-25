import { describe, expect, it } from "vitest";
import { proposeDelayChanges, shiftIsoMinutes } from "@/lib/flightImpact";

const stops = [
  { id: "land", title: "Land in Denver", time: "2026-09-27T08:10:00-06:00" },
  { id: "car", title: "NU Car Rental", time: "2026-09-27T08:29:00-06:00" },
  { id: "walmart", title: "Walmart stop", time: "2026-09-27T09:00:00-06:00" },
  { id: "checkin", title: "Check in", time: "2026-09-27T12:30:00-06:00" },
  { id: "untimed", title: "Someday", time: null },
  { id: "before", title: "Arrive at DFW parking", time: "2026-09-27T05:30:00-05:00" },
];
const flight = {
  departureIso: "2026-09-27T07:05:00-05:00",
  arrivalClock: "08:10:00-06:00",
  stops,
};

describe("proposeDelayChanges", () => {
  it("moves activities that would now start before landing, by the delay", () => {
    const changes = proposeDelayChanges({ ...flight, delayMinutes: 90 });
    expect(changes.map((c) => c.id)).toEqual(["land", "car", "walmart"]);
    expect(changes[2]).toMatchObject({ oldTime: "2026-09-27T09:00:00-06:00", newTime: "2026-09-27T10:30:00-06:00" });
  });

  it("leaves everything alone for a small delay", () => {
    expect(proposeDelayChanges({ ...flight, delayMinutes: 20 })).toEqual([]);
  });

  it("only catches activities that fall inside the delayed window", () => {
    const changes = proposeDelayChanges({ ...flight, delayMinutes: 45 });
    expect(changes.map((c) => c.id)).toEqual(["land", "car"]);
  });
});

describe("shiftIsoMinutes", () => {
  it("keeps the offset and rolls over midnight", () => {
    expect(shiftIsoMinutes("2026-09-27T23:30:00-06:00", 60)).toBe("2026-09-28T00:30:00-06:00");
  });
});
