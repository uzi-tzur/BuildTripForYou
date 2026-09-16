import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { userPreferenceFromRow } from "@/lib/db/mappers";
import type { TravelerType, TripPace, UserPreference } from "@/lib/types";

type DB = SupabaseClient<Database>;

export interface SaveUserPreferenceInput {
  travelerType: TravelerType;
  interests: string[];
  budgetLevel: "low" | "medium" | "high" | null;
  pace: TripPace;
  outdoorIndoorBalance: "outdoor" | "indoor" | "balanced";
  foodPreferences: string[];
  accommodationPreferences: string[];
  travelerAges: string | null;
}

/** Preference Service (PRD Section 42 service layer, UserPreference entity). */
export const preferenceService = {
  async saveForUser(db: DB, userId: string, input: SaveUserPreferenceInput): Promise<UserPreference> {
    const { data, error } = await db
      .from("user_preferences")
      .insert({
        user_id: userId,
        traveler_type: input.travelerType,
        interests: input.interests,
        budget_level: input.budgetLevel,
        pace: input.pace,
        outdoor_indoor_balance: input.outdoorIndoorBalance,
        food_preferences: input.foodPreferences,
        accommodation_preferences: input.accommodationPreferences,
        traveler_ages: input.travelerAges,
      })
      .select("*")
      .single();
    if (error) throw error;
    return userPreferenceFromRow(data);
  },

  async getLatestForUser(db: DB, userId: string): Promise<UserPreference | null> {
    const { data, error } = await db
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? userPreferenceFromRow(data) : null;
  },
};
