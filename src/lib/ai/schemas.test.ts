import { describe, expect, it } from "vitest";
import { TripPlanSchema } from "./schemas";

describe("TripPlanSchema — validates AI-generated structured output (PRD Rule)", () => {
  it("accepts a well-formed plan", () => {
    const result = TripPlanSchema.safeParse({
      overallSummary: "A 2-day trip.",
      days: [
        {
          dayNumber: 1,
          summary: "Arrival day",
          activities: [
            {
              destinationId: "dest-1",
              activityType: "attraction",
              title: "Museum",
              startTime: "09:00",
              endTime: "11:00",
              notes: null,
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a plan with an invalid activityType", () => {
    const result = TripPlanSchema.safeParse({
      overallSummary: "Bad plan",
      days: [
        {
          dayNumber: 1,
          summary: "x",
          activities: [
            {
              destinationId: null,
              activityType: "sightseeing", // not in the enum
              title: "Something",
              startTime: "09:00",
              endTime: "10:00",
              notes: null,
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a plan missing required fields", () => {
    const result = TripPlanSchema.safeParse({ days: [] });
    expect(result.success).toBe(false);
  });
});
