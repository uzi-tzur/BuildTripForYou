import { describe, expect, it } from "vitest";
import { laterOnSameDayMinutes, proposeFollowingShift } from "./activityImpact";

describe("laterOnSameDayMinutes", () => {
  it("measures a move to later the same day", () => {
    expect(laterOnSameDayMinutes("2026-09-29T13:00:00-06:00", "2026-09-29", "13:45")).toBe(45);
  });

  it("ignores moves earlier, to another day, or from no time", () => {
    expect(laterOnSameDayMinutes("2026-09-29T13:00:00-06:00", "2026-09-29", "12:30")).toBeNull();
    expect(laterOnSameDayMinutes("2026-09-29T13:00:00-06:00", "2026-09-30", "13:45")).toBeNull();
    expect(laterOnSameDayMinutes(null, "2026-09-29", "13:45")).toBeNull();
    expect(laterOnSameDayMinutes("2026-09-29T13:00:00-06:00", "2026-09-29", "")).toBeNull();
  });
});

describe("proposeFollowingShift", () => {
  const stops = [
    { id: "lunch", title: "Lunch in Boulder", time: "2026-09-29T15:00:00-06:00" },
    { id: "breakfast", title: "Breakfast", time: "2026-09-29T08:00:00-06:00" },
    { id: "hotel", title: "Check in", time: "2026-09-29T17:30:00-06:00" },
    { id: "untimed", title: "Souvenirs", time: null },
  ];

  it("moves every later activity back by the delay, in time order, keeping each one's offset", () => {
    expect(proposeFollowingShift({ movedFromIso: "2026-09-29T13:00:00-06:00", delayMinutes: 45, stops })).toEqual([
      { id: "lunch", title: "Lunch in Boulder", oldTime: "2026-09-29T15:00:00-06:00", newTime: "2026-09-29T15:45:00-06:00" },
      { id: "hotel", title: "Check in", oldTime: "2026-09-29T17:30:00-06:00", newTime: "2026-09-29T18:15:00-06:00" },
    ]);
  });

  it("stops at the next flight — what follows it depends on the landing, not on this activity", () => {
    const changes = proposeFollowingShift({ movedFromIso: "2026-09-29T13:00:00-06:00", delayMinutes: 45, stops, untilIso: "2026-09-29T16:00:00-06:00" });
    expect(changes.map((c) => c.id)).toEqual(["lunch"]);
  });

  it("proposes nothing without a delay", () => {
    expect(proposeFollowingShift({ movedFromIso: "2026-09-29T13:00:00-06:00", delayMinutes: 0, stops })).toEqual([]);
  });
});
