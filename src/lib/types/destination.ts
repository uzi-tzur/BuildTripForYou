import type { DataFreshness } from "./common";

/** PRD Section 38 — Destination entity, extended with Section 5.2 "Destination Intelligence" fields. */
export interface Destination {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  imageUrl: string | null;
  rating: number | null;
  price: number | null;
  openingHours: string | null;
  reservationRequired: boolean;
  recommendedDurationMinutes: number | null;
  bookingUrl: string | null;
  bestTimeToVisit: string | null;
  source: string;
  lastVerifiedAt: string | null;
  freshness?: DataFreshness;
}

export interface AiDestinationRecommendation {
  destinationId: string;
  score: number; // 0-5 stars, mirrors "AI Recommendation" star rating
  reasons: string[];
}
