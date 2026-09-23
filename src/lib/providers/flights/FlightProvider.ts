export interface FlightStatusRequest {
  flightNumber: string; // e.g. "AA1523"
  airport?: string | null;
  airline?: string | null;
}

export type FlightStatusCode = "scheduled" | "active" | "landed" | "cancelled" | "diverted" | "incident" | "unknown";

export interface FlightStatusResult {
  flightNumber: string;
  airline: string | null;
  status: FlightStatusCode;
  departureAirport: string | null;
  departureScheduled: string | null; // ISO
  departureEstimated: string | null; // ISO
  departureGate: string | null;
  departureTerminal: string | null;
  arrivalAirport: string | null;
  arrivalScheduled: string | null; // ISO
  provider: string;
}

/** Provider abstraction for flight-status lookups, same pattern as WeatherProvider/ImageProvider. */
export interface FlightProvider {
  /** Returns null when the flight number isn't found (not just no data yet). */
  getStatus(request: FlightStatusRequest): Promise<FlightStatusResult | null>;
}
