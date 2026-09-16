import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { routeFromRow } from "@/lib/db/mappers";
import { getRoutingProvider } from "@/lib/providers/routing";
import type { Route, TransportationMode } from "@/lib/types";

type DB = SupabaseClient<Database>;

/** Routing Service (PRD Section 42) — backed by the active RoutingProvider. */
export const routingService = {
  async getRoute(
    db: DB,
    origin: string,
    destination: string,
    travelMode: TransportationMode,
    tripId?: string,
  ): Promise<Route> {
    if (tripId) {
      const { data: existing } = await db
        .from("routes")
        .select("*")
        .eq("trip_id", tripId)
        .eq("origin", origin)
        .eq("destination", destination)
        .eq("travel_mode", travelMode)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) return routeFromRow(existing);
    }

    const route = await getRoutingProvider().calculateRoute({ origin, destination, travelMode });

    const { data, error } = await db
      .from("routes")
      .insert({
        trip_id: tripId ?? null,
        origin: route.origin,
        destination: route.destination,
        distance_meters: route.distanceMeters,
        estimated_duration_seconds: route.estimatedDurationSeconds,
        traffic_duration_seconds: route.trafficDurationSeconds,
        departure_time: route.departureTime,
        arrival_time: route.arrivalTime,
        provider: route.provider,
        travel_mode: route.travelMode,
        route_data: route.routeData,
      })
      .select("*")
      .single();

    if (error) throw error;
    return routeFromRow(data);
  },
};
