import { z } from "zod";

/**
 * Structured output contract for the Trip Planner Agent (PRD Rule: validate
 * all AI-generated structured data before it touches the database).
 */
export const PlannedActivitySchema = z.object({
  destinationId: z.string().nullable(),
  activityType: z.enum(["travel", "meal", "attraction", "lodging", "free_time", "other"]),
  title: z.string(),
  startTime: z.string(), // "HH:MM", 24h
  endTime: z.string(),
  notes: z.string().nullable(),
});

export const PlannedDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  summary: z.string(),
  activities: z.array(PlannedActivitySchema),
});

export const TripPlanSchema = z.object({
  overallSummary: z.string(),
  days: z.array(PlannedDaySchema),
});

export type PlannedActivity = z.infer<typeof PlannedActivitySchema>;
export type PlannedDay = z.infer<typeof PlannedDaySchema>;
export type TripPlan = z.infer<typeof TripPlanSchema>;
