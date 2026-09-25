export interface FlightStatusRequest {
  flightNumber: string; // e.g. "AA1523"
  airport?: string | null;
  airline?: string | null;
  /** The itinerary's expected departure date (YYYY-MM-DD) and local time ("HH:MM") — lets the result be checked against the right day. */
  departureDate?: string | null;
  departureTime?: string | null;
}

export type FlightStatusCode = "scheduled" | "active" | "landed" | "cancelled" | "diverted" | "incident" | "unknown";

/**
 * Times are airport-local wall-clock strings ("2026-09-27T07:05"), with no
 * offset — some providers label local times as UTC, so an offset can't be
 * trusted and displaying the wall-clock digits is the only reliably correct thing.
 */
export interface FlightStatusResult {
  flightNumber: string;
  airline: string | null;
  /** The date this status is actually for — may differ from the itinerary's date (free tiers only cover live/recent flights). */
  flightDate: string | null;
  status: FlightStatusCode;
  departureAirport: string | null;
  departureScheduled: string | null;
  departureEstimated: string | null;
  departureDelayMinutes: number | null;
  departureGate: string | null;
  departureTerminal: string | null;
  arrivalAirport: string | null;
  arrivalScheduled: string | null;
  provider: string;
}

/** Provider abstraction for flight-status lookups, same pattern as WeatherProvider/ImageProvider. */
export interface FlightProvider {
  /** Returns null when the flight number isn't found (not just no data yet). */
  getStatus(request: FlightStatusRequest): Promise<FlightStatusResult | null>;
}
