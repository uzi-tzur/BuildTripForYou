import type { ISODateString, TransportationMode, TripStatus } from "./common";

/** PRD Section 36 — Trip entity. */
export interface Trip {
  id: string;
  userId: string;
  name: string;
  startDate: ISODateString;
  endDate: ISODateString;
  origin: string;
  destination: string;
  travelers: number;
  transportationMode: TransportationMode;
  budget: number | null;
  status: TripStatus;
  createdAt: string;
  updatedAt: string;
}

/** One day within a trip, grouping ordered activities (PRD Section 26 "Daily Itinerary"). */
export interface TripDay {
  id: string;
  tripId: string;
  date: ISODateString;
  dayNumber: number;
  summary: string | null;
}

export type ActivityType = "travel" | "meal" | "attraction" | "lodging" | "free_time" | "other";
export type ActivityStatus = "planned" | "in_progress" | "completed" | "skipped" | "cancelled";

/** PRD Section 37 — Activity entity. */
export interface Activity {
  id: string;
  tripDayId: string;
  destinationId: string | null;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  activityType: ActivityType;
  status: ActivityStatus;
  reservationRequired: boolean;
  reservationStatus: "not_required" | "pending" | "confirmed" | null;
  notes: string | null;
  sequence: number;
}
