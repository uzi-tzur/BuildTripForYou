import type Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL, getAnthropicClient } from "@/lib/ai/client";
import { TripPlanSchema, type TripPlan } from "@/lib/ai/schemas";
import type { Destination, Trip, UserPreference } from "@/lib/types";
import { generateMockTripPlan } from "./tripPlanner.mock";

export interface TripPlannerInput {
  trip: Pick<Trip, "origin" | "destination" | "startDate" | "endDate" | "travelers" | "transportationMode">;
  preferences: Pick<UserPreference, "travelerType" | "interests" | "pace" | "budgetLevel">;
  candidateDestinations: Destination[];
}

const PLAN_TOOL_SCHEMA: Anthropic.Messages.Tool.InputSchema = {
  type: "object",
  properties: {
    overallSummary: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dayNumber: { type: "integer" },
          summary: { type: "string" },
          activities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                destinationId: { type: ["string", "null"] },
                activityType: {
                  type: "string",
                  enum: ["travel", "meal", "attraction", "lodging", "free_time", "other"],
                },
                title: { type: "string" },
                startTime: { type: "string", description: "24h HH:MM" },
                endTime: { type: "string", description: "24h HH:MM" },
                notes: { type: ["string", "null"] },
              },
              required: ["destinationId", "activityType", "title", "startTime", "endTime", "notes"],
            },
          },
        },
        required: ["dayNumber", "summary", "activities"],
      },
    },
  },
  required: ["overallSummary", "days"],
};

function dayCountFor(input: TripPlannerInput): number {
  const start = new Date(input.trip.startDate);
  const end = new Date(input.trip.endDate);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.max(1, days);
}

/**
 * Trip Planner Agent (PRD Section 19). Produces a structured day-by-day
 * plan only — it never writes to the database itself (Rule 6); the
 * orchestrator persists it via tripService/destinationService after
 * validation.
 */
export async function planTrip(input: TripPlannerInput): Promise<{ plan: TripPlan; usedMockAi: boolean }> {
  const client = getAnthropicClient();
  const dayCount = dayCountFor(input);

  if (!client) {
    return { plan: generateMockTripPlan(dayCount, input.candidateDestinations), usedMockAi: true };
  }

  const candidateList = input.candidateDestinations
    .map(
      (d) =>
        `- id=${d.id} | ${d.name} | category=${d.category} | rating=${d.rating ?? "?"} | price=${d.price ?? "?"} | durationMin=${d.recommendedDurationMinutes ?? "?"} | reservationRequired=${d.reservationRequired}`,
    )
    .join("\n");

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system:
      "You are the Trip Planner Agent for BuildTripForYou, an AI travel-planning app. " +
      "Build a realistic day-by-day itinerary using ONLY the candidate destinations " +
      "provided (by their id) for attraction/meal-at-a-place activities, plus generic " +
      "meal/free-time/travel blocks where no specific destination fits. Respect the " +
      "traveler's pace and interests. Always call the return_trip_plan tool with your answer.",
    messages: [
      {
        role: "user",
        content:
          `Trip: ${input.trip.origin} -> ${input.trip.destination}, ${dayCount} day(s), ` +
          `${input.trip.travelers} traveler(s), transportation: ${input.trip.transportationMode}.\n` +
          `Traveler type: ${input.preferences.travelerType}. Pace: ${input.preferences.pace}. ` +
          `Budget level: ${input.preferences.budgetLevel ?? "unspecified"}. ` +
          `Interests: ${input.preferences.interests.join(", ") || "unspecified"}.\n\n` +
          `Candidate destinations:\n${candidateList || "(none found — use generic activity blocks)"}`,
      },
    ],
    tools: [
      {
        name: "return_trip_plan",
        description: "Return the completed day-by-day trip plan.",
        input_schema: PLAN_TOOL_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "return_trip_plan" },
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Trip Planner Agent: Claude did not return a tool_use block.");
  }

  const parsed = TripPlanSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(`Trip Planner Agent: invalid plan shape — ${parsed.error.message}`);
  }

  return { plan: parsed.data, usedMockAi: false };
}
