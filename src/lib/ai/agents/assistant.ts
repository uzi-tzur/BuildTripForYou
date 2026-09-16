import { CLAUDE_MODEL, getAnthropicClient } from "@/lib/ai/client";
import type { Trip } from "@/lib/types";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantContext {
  trip: Pick<Trip, "name" | "origin" | "destination" | "startDate" | "endDate"> | null;
  itinerarySummary: string | null;
}

/** Scripted fallback used when ANTHROPIC_API_KEY isn't set (PRD Rule 5). */
function mockReply(message: string, context: AssistantContext): string {
  const lower = message.toLowerCase();
  const tripNote = context.trip ? ` for your trip to ${context.trip.destination}` : "";

  if (lower.includes("rain") || lower.includes("weather")) {
    return `I can't check live weather in demo mode, but if rain is likely${tripNote} I'd suggest an indoor alternative or moving outdoor activities earlier in the day. Try the "Check weather now" button on the Live Trip screen for a real Trip Guardian pass.`;
  }
  if (lower.includes("late") || lower.includes("behind") || lower.includes("delay")) {
    return `If you're running behind${tripNote}, head to the Live Trip screen and use "Simulate delay" — Trip Guardian will propose a recalculated schedule for you to approve.`;
  }
  if (lower.includes("next") || lower.includes("what should")) {
    return `Check the Daily Itinerary screen for what's next${tripNote} — I can give more tailored suggestions once a real AI connection (ANTHROPIC_API_KEY) is configured.`;
  }
  return `I'm running in demo mode right now (no ANTHROPIC_API_KEY set), so I can only give generic tips${tripNote}. Connect a real Claude API key to get fully personalized answers.`;
}

/**
 * AI Travel Assistant (PRD Section 30). Answers free-form questions using
 * the trip's context. Read-only — it never mutates trip data itself
 * (Rule 6); if it needs to trigger a real change, it should point the
 * user at the relevant screen/action instead.
 */
export async function answerAssistantQuery(
  message: string,
  context: AssistantContext,
  history: AssistantMessage[] = [],
): Promise<{ reply: string; usedMockAi: boolean }> {
  const client = getAnthropicClient();
  if (!client) {
    return { reply: mockReply(message, context), usedMockAi: true };
  }

  const systemPrompt =
    "You are the AI Travel Assistant for BuildTripForYou. Be concise and helpful. " +
    "You cannot directly change the itinerary yourself — if the user needs a " +
    "schedule change, point them at the Live Trip screen's Trip Guardian " +
    "controls or the relevant screen, since all itinerary changes require " +
    "explicit user approval.\n\n" +
    (context.trip
      ? `Current trip: ${context.trip.name}, ${context.trip.origin} -> ${context.trip.destination}, ${context.trip.startDate} to ${context.trip.endDate}.\n${context.itinerarySummary ?? ""}`
      : "No trip is currently loaded.");

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    system: systemPrompt,
    messages: [...history, { role: "user", content: message }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const reply = textBlock && textBlock.type === "text" ? textBlock.text : "I'm not sure how to answer that.";

  return { reply, usedMockAi: false };
}
