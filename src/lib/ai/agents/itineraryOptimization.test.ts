import { describe, expect, it } from "vitest";
import { optimizeSchedule } from "./itineraryOptimization";
import type { Activity } from "@/lib/types";

function activity(overrides: Partial<Activity>): Activity {
  return {
    id: "a1",
    tripDayId: "day1",
    destinationId: null,
    startTime: "2026-06-01T09:00:00.000Z",
    endTime: "2026-06-01T10:00:00.000Z",
    durationMinutes: 60,
    activityType: "attraction",
    status: "planned",
    reservationRequired: false,
    reservationStatus: null,
    notes: null,
    sequence: 0,
    ...overrides,
  };
}

describe("optimizeSchedule — delay_replan", () => {
  it("shifts every activity in the day by the delay, preserving duration", () => {
    const day = [
      activity({ id: "a1", startTime: "2026-06-01T09:00:00.000Z", endTime: "2026-06-01T10:00:00.000Z", sequence: 0 }),
      activity({ id: "a2", startTime: "2026-06-01T11:00:00.000Z", endTime: "2026-06-01T12:00:00.000Z", sequence: 1 }),
    ];

    const result = optimizeSchedule(day, { kind: "delay_replan", delayMinutes: 45 });

    expect(result).toHaveLength(2);
    expect(result[0]!.startTime).toBe("2026-06-01T09:45:00.000Z");
    expect(result[0]!.endTime).toBe("2026-06-01T10:45:00.000Z");
    expect(result[1]!.startTime).toBe("2026-06-01T11:45:00.000Z");
    // Duration must be unchanged by a uniform shift.
    const durationMs = new Date(result[1]!.endTime).getTime() - new Date(result[1]!.startTime).getTime();
    expect(durationMs).toBe(60 * 60_000);
  });
});

describe("optimizeSchedule — weather_reschedule", () => {
  it("moves only the flagged activity to after the day's last activity, with a buffer", () => {
    const day = [
      activity({ id: "hike", startTime: "2026-06-01T10:00:00.000Z", endTime: "2026-06-01T12:00:00.000Z", sequence: 0 }),
      activity({ id: "lunch", startTime: "2026-06-01T12:30:00.000Z", endTime: "2026-06-01T13:30:00.000Z", sequence: 1 }),
      activity({ id: "museum", startTime: "2026-06-01T14:00:00.000Z", endTime: "2026-06-01T16:00:00.000Z", sequence: 2 }),
    ];

    const result = optimizeSchedule(day, { kind: "weather_reschedule", activityId: "hike" });

    expect(result).toHaveLength(1);
    const [change] = result;
    expect(change!.activityId).toBe("hike");
    // Starts 30 minutes after the day's last activity ends (museum ends 16:00).
    expect(change!.startTime).toBe("2026-06-01T16:30:00.000Z");
    // Original 2-hour duration is preserved.
    const durationMs = new Date(change!.endTime).getTime() - new Date(change!.startTime).getTime();
    expect(durationMs).toBe(2 * 60 * 60_000);
    // Moved to the end of the sequence.
    expect(change!.sequence).toBe(3);
  });

  it("returns no changes when the target activity isn't found", () => {
    const day = [activity({ id: "only" })];
    const result = optimizeSchedule(day, { kind: "weather_reschedule", activityId: "missing" });
    expect(result).toEqual([]);
  });
});
