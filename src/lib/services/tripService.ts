import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { activityFromRow, tripDayFromRow, tripFromRow } from "@/lib/db/mappers";
import type { Activity, ActivityType, Trip, TripDay, TransportationMode } from "@/lib/types";

type DB = SupabaseClient<Database>;

export interface CreateTripInput {
  name: string;
  startDate: string;
  endDate: string;
  origin: string;
  destination: string;
  travelers: number;
  transportationMode: TransportationMode;
  budget: number | null;
}

/**
 * Trip Service (PRD Section 42). Owns all reads/writes to core trip data.
 * Per Rule 6, AI agents never mutate trip data directly — they produce
 * recommendations, and only this service (after user approval where
 * required) commits changes. Every method takes a request-scoped Supabase
 * client so callers (route handlers, server actions) control the session.
 */
export const tripService = {
  async listTrips(db: DB, userId: string): Promise<Trip[]> {
    const { data, error } = await db
      .from("trips")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data.map(tripFromRow);
  },

  async getTrip(db: DB, tripId: string): Promise<Trip> {
    const { data, error } = await db.from("trips").select("*").eq("id", tripId).single();
    if (error) throw error;
    return tripFromRow(data);
  },

  async createTrip(db: DB, userId: string, input: CreateTripInput): Promise<Trip> {
    const { data, error } = await db
      .from("trips")
      .insert({
        user_id: userId,
        name: input.name,
        start_date: input.startDate,
        end_date: input.endDate,
        origin: input.origin,
        destination: input.destination,
        travelers: input.travelers,
        transportation_mode: input.transportationMode,
        budget: input.budget,
        status: "draft",
      })
      .select("*")
      .single();
    if (error) throw error;
    return tripFromRow(data);
  },

  async updateTrip(db: DB, tripId: string, changes: Partial<Trip>): Promise<Trip> {
    const { data, error } = await db
      .from("trips")
      .update({
        ...(changes.name !== undefined && { name: changes.name }),
        ...(changes.status !== undefined && { status: changes.status }),
        ...(changes.budget !== undefined && { budget: changes.budget }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", tripId)
      .select("*")
      .single();
    if (error) throw error;
    return tripFromRow(data);
  },

  async listTripDays(db: DB, tripId: string): Promise<TripDay[]> {
    const { data, error } = await db
      .from("trip_days")
      .select("*")
      .eq("trip_id", tripId)
      .order("day_number", { ascending: true });
    if (error) throw error;
    return data.map(tripDayFromRow);
  },

  async createTripDay(db: DB, tripId: string, date: string, dayNumber: number): Promise<TripDay> {
    const { data, error } = await db
      .from("trip_days")
      .insert({ trip_id: tripId, date, day_number: dayNumber })
      .select("*")
      .single();
    if (error) throw error;
    return tripDayFromRow(data);
  },

  async listActivitiesForDay(db: DB, tripDayId: string): Promise<Activity[]> {
    const { data, error } = await db
      .from("activities")
      .select("*")
      .eq("trip_day_id", tripDayId)
      .order("sequence", { ascending: true });
    if (error) throw error;
    return data.map(activityFromRow);
  },

  async createActivity(
    db: DB,
    input: {
      tripDayId: string;
      destinationId: string | null;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      activityType: ActivityType;
      sequence: number;
      notes?: string | null;
      reservationRequired?: boolean;
    },
  ): Promise<Activity> {
    const { data, error } = await db
      .from("activities")
      .insert({
        trip_day_id: input.tripDayId,
        destination_id: input.destinationId,
        start_time: input.startTime,
        end_time: input.endTime,
        duration_minutes: input.durationMinutes,
        activity_type: input.activityType,
        sequence: input.sequence,
        notes: input.notes ?? null,
        reservation_required: input.reservationRequired ?? false,
      })
      .select("*")
      .single();
    if (error) throw error;
    return activityFromRow(data);
  },

  async updateActivity(db: DB, activityId: string, changes: Partial<Activity>): Promise<Activity> {
    const { data, error } = await db
      .from("activities")
      .update({
        ...(changes.startTime !== undefined && { start_time: changes.startTime }),
        ...(changes.endTime !== undefined && { end_time: changes.endTime }),
        ...(changes.durationMinutes !== undefined && { duration_minutes: changes.durationMinutes }),
        ...(changes.status !== undefined && { status: changes.status }),
        ...(changes.notes !== undefined && { notes: changes.notes }),
        ...(changes.sequence !== undefined && { sequence: changes.sequence }),
      })
      .eq("id", activityId)
      .select("*")
      .single();
    if (error) throw error;
    return activityFromRow(data);
  },
};
