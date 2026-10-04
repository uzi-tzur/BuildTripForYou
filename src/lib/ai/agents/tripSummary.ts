import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { getAnthropicClient } from "@/lib/ai/client";
import { sanitizeSummaryText, summaryTextSchema, type SummaryRequest, type TripSummaryText } from "@/lib/tripSummary";

const SUMMARY_MODEL = "claude-opus-5-5";

const SYSTEM_PROMPT =
  "You write the short text for a trip infographic, in both Hebrew and English. " +
  "For each day, in the order given, write a title of 2-6 words naming the day's highlights and a summary of one or two short sentences (at most 25 words). " +
  "Also write one warm tagline for the whole trip (at most 12 words). " +
  "Use only the places and activities listed — never invent places, times or facts. " +
  "Skip routine logistics (parking, check-in, store runs) unless the day has nothing else. " +
  "In the Hebrew text, keep proper names of places, trails, restaurants and hotels in their usual form; transliterate them to Hebrew only when a common Hebrew spelling exists. " +
  "Return exactly one entry per day in each language.";

/**
 * Writes the infographic text with Claude. Returns null when Claude isn't
 * configured or the answer can't be used, so the caller falls back to text
 * built from the activity names (PRD Rule 5 — labeled, never presented as AI).
 */
export async function writeTripSummary(request: SummaryRequest): Promise<TripSummaryText | null> {
  const client = getAnthropicClient();
  if (!client) return null;

  try {
    const response = await client.beta.messages.parse({
      model: SUMMARY_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(summaryTextSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(request) }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return null;

    const text = sanitizeSummaryText({ ...response.parsed_output, writtenByAi: true });
    if (!text || text.he.days.length !== request.days.length || text.en.days.length !== request.days.length) return null;
    return text;
  } catch (error) {
    if (error instanceof Anthropic.APIError) console.error(`trip-summary: Claude API error ${error.status}: ${error.message}`);
    else console.error("trip-summary: couldn't write the summary", error);
    return null;
  }
}
