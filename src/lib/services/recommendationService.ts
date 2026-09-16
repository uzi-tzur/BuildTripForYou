import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { recommendationFromRow } from "@/lib/db/mappers";
import type { Recommendation } from "@/lib/types";

type DB = SupabaseClient<Database>;

/**
 * Recommendation Service (PRD Section 42). Persists structured
 * recommendations produced by AI agents (PRD Section 20 "AI
 * Orchestration") and records the user's approve/reject decision
 * (PRD Section 17 "User Approval Layer"). `payload` carries the
 * machine-readable proposed change (e.g. a new schedule from the
 * Itinerary Optimization Agent) that the resolve route applies on
 * approval — never applied automatically.
 */
export const recommendationService = {
  async createRecommendation(
    db: DB,
    input: {
      tripId: string;
      activityId: string | null;
      title: string;
      reasons: string[];
      impactSummary: string | null;
      payload?: unknown;
    },
  ): Promise<Recommendation> {
    const { data, error } = await db
      .from("recommendations")
      .insert({
        trip_id: input.tripId,
        activity_id: input.activityId,
        title: input.title,
        reasons: input.reasons,
        impact_summary: input.impactSummary,
        payload: input.payload ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return recommendationFromRow(data);
  },

  async listPendingForTrip(db: DB, tripId: string): Promise<Recommendation[]> {
    const { data, error } = await db
      .from("recommendations")
      .select("*")
      .eq("trip_id", tripId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data.map(recommendationFromRow);
  },

  async getRecommendation(db: DB, recommendationId: string): Promise<Recommendation & { payload: unknown }> {
    const { data, error } = await db.from("recommendations").select("*").eq("id", recommendationId).single();
    if (error) throw error;
    return { ...recommendationFromRow(data), payload: data.payload };
  },

  async resolveRecommendation(
    db: DB,
    recommendationId: string,
    decision: "approved" | "rejected",
  ): Promise<Recommendation> {
    const { data, error } = await db
      .from("recommendations")
      .update({ status: decision })
      .eq("id", recommendationId)
      .select("*")
      .single();
    if (error) throw error;
    return recommendationFromRow(data);
  },
};
