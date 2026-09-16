/**
 * Data freshness / confidence tracking (PRD Section 41 "Data Freshness"
 * and Section 46 "Handling Uncertainty"). Any time-sensitive field pulled
 * from an external provider should be wrapped with this so the UI can
 * distinguish Verified / Estimated / Predicted / Unknown and never
 * fabricate missing information.
 */
export type ConfidenceLevel = "verified" | "estimated" | "predicted" | "unknown";

export interface DataFreshness {
  source: string;
  lastVerifiedAt: string | null;
  confidence: ConfidenceLevel;
}

export type ISODateString = string;
export type ISODateTimeString = string;

export type TransportationMode = "driving" | "flying" | "walking" | "transit" | "mixed";

export type TripStatus = "draft" | "planned" | "active" | "completed" | "cancelled";
