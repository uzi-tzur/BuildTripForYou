import type { Database } from "./database.types";
import type {
  Activity,
  ActivityStatus,
  ActivityType,
  ConfidenceLevel,
  Destination,
  Recommendation,
  Route,
  Trip,
  TripDay,
  TripStatus,
  TransportationMode,
  TravelerType,
  TripPace,
  UserPreference,
  WeatherAlert,
} from "@/lib/types";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type TripDayRow = Database["public"]["Tables"]["trip_days"]["Row"];
type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type DestinationRow = Database["public"]["Tables"]["destinations"]["Row"];
type RouteRow = Database["public"]["Tables"]["routes"]["Row"];
type RecommendationRow = Database["public"]["Tables"]["recommendations"]["Row"];
type WeatherAlertRow = Database["public"]["Tables"]["weather_alerts"]["Row"];
type UserPreferenceRow = Database["public"]["Tables"]["user_preferences"]["Row"];

export function userPreferenceFromRow(row: UserPreferenceRow): UserPreference {
  return {
    id: row.id,
    userId: row.user_id,
    travelerType: row.traveler_type as TravelerType,
    interests: row.interests,
    budgetLevel: row.budget_level as UserPreference["budgetLevel"],
    pace: row.pace as TripPace,
    outdoorIndoorBalance: row.outdoor_indoor_balance as UserPreference["outdoorIndoorBalance"],
    foodPreferences: row.food_preferences,
    accommodationPreferences: row.accommodation_preferences,
    travelerAges: row.traveler_ages,
  };
}

export function tripFromRow(row: TripRow): Trip {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    origin: row.origin,
    destination: row.destination,
    travelers: row.travelers,
    transportationMode: row.transportation_mode as TransportationMode,
    budget: row.budget,
    status: row.status as TripStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function tripDayFromRow(row: TripDayRow): TripDay {
  return {
    id: row.id,
    tripId: row.trip_id,
    date: row.date,
    dayNumber: row.day_number,
    summary: row.summary,
  };
}

export function activityFromRow(row: ActivityRow): Activity {
  return {
    id: row.id,
    tripDayId: row.trip_day_id,
    destinationId: row.destination_id,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    activityType: row.activity_type as ActivityType,
    status: row.status as ActivityStatus,
    reservationRequired: row.reservation_required,
    reservationStatus: row.reservation_status as Activity["reservationStatus"],
    notes: row.notes,
    sequence: row.sequence,
  };
}

export function destinationFromRow(row: DestinationRow): Destination {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    phone: row.phone,
    website: row.website,
    imageUrl: row.image_url,
    rating: row.rating,
    price: row.price,
    openingHours: row.opening_hours,
    reservationRequired: row.reservation_required,
    recommendedDurationMinutes: row.recommended_duration_minutes,
    bookingUrl: row.booking_url,
    bestTimeToVisit: row.best_time_to_visit,
    source: row.source,
    lastVerifiedAt: row.last_verified_at,
    freshness: {
      source: row.source,
      lastVerifiedAt: row.last_verified_at,
      confidence: (row.source === "mock" ? "unknown" : "verified") as ConfidenceLevel,
    },
  };
}

export function destinationToInsertRow(
  destination: Omit<Destination, "id" | "freshness">,
  externalId: string | null,
): Database["public"]["Tables"]["destinations"]["Insert"] {
  return {
    external_id: externalId,
    name: destination.name,
    description: destination.description,
    category: destination.category,
    address: destination.address,
    latitude: destination.latitude,
    longitude: destination.longitude,
    phone: destination.phone,
    website: destination.website,
    image_url: destination.imageUrl,
    rating: destination.rating,
    price: destination.price,
    opening_hours: destination.openingHours,
    reservation_required: destination.reservationRequired,
    recommended_duration_minutes: destination.recommendedDurationMinutes,
    booking_url: destination.bookingUrl,
    best_time_to_visit: destination.bestTimeToVisit,
    source: destination.source,
    last_verified_at: destination.lastVerifiedAt,
  };
}

export function routeFromRow(row: RouteRow): Route {
  return {
    id: row.id,
    origin: row.origin,
    destination: row.destination,
    distanceMeters: row.distance_meters,
    estimatedDurationSeconds: row.estimated_duration_seconds,
    trafficDurationSeconds: row.traffic_duration_seconds,
    departureTime: row.departure_time,
    arrivalTime: row.arrival_time,
    provider: row.provider,
    travelMode: row.travel_mode as Route["travelMode"],
    routeData: row.route_data,
    calculatedAt: row.calculated_at,
  };
}

export function recommendationFromRow(row: RecommendationRow): Recommendation {
  return {
    id: row.id,
    tripId: row.trip_id,
    activityId: row.activity_id,
    title: row.title,
    reasons: row.reasons,
    impactSummary: row.impact_summary,
    status: row.status as Recommendation["status"],
    createdAt: row.created_at,
  };
}

export function weatherAlertFromRow(row: WeatherAlertRow): WeatherAlert {
  return {
    id: row.id,
    tripId: row.trip_id,
    activityId: row.activity_id,
    alertType: row.alert_type,
    severity: row.severity as WeatherAlert["severity"],
    message: row.message,
    detectedAt: row.detected_at,
    recommendedAction: row.recommended_action,
    status: row.status as WeatherAlert["status"],
  };
}
