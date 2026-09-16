import { NotImplementedError } from "@/lib/errors";
import type { AiDestinationRecommendation, Destination } from "@/lib/types";

/**
 * Destination Intelligence Agent (PRD Section 19). Researches and
 * evaluates attractions (rating, price, hours, reservations, weather fit).
 * Wired up in Phase 4.
 */
export async function evaluateDestinations(
  _candidates: Destination[],
): Promise<AiDestinationRecommendation[]> {
  throw new NotImplementedError("destinationIntelligenceAgent.evaluateDestinations");
}
