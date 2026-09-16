/** PRD Section 3 "Target Users" + "UserPreference" entity (Section 35). */
export type TravelerType = "solo" | "couple" | "family" | "road-trip" | "group";
export type TripPace = "relaxed" | "moderate" | "packed";

export interface UserPreference {
  id: string;
  userId: string;
  travelerType: TravelerType;
  interests: string[];
  budgetLevel: "low" | "medium" | "high" | null;
  pace: TripPace;
  outdoorIndoorBalance: "outdoor" | "indoor" | "balanced";
  foodPreferences: string[];
  accommodationPreferences: string[];
  travelerAges: string | null;
}

/** PRD Section 35 "Booking" entity — future capability, defined now for type stability. */
export interface Booking {
  id: string;
  tripId: string;
  activityId: string;
  provider: string;
  status: "not_required" | "pending" | "confirmed" | "cancelled";
  confirmationCode: string | null;
  bookingUrl: string | null;
}
