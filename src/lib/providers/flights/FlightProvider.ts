export interface FlightStatusRequest {
  /** Airline code + number, e.g. "AA1523". */
  flightNumber: string;
  /** Departure date, YYYY-MM-DD. */
  flightDate: string;
  departureAirport?: string | null;
  arrivalAirport?: string | null;
}

export type FlightStatusCode = "scheduled" | "departed" | "landed" | "cancelled" | "diverted" | "incident" | "unknown";

/**
 * Times are airport-local wall-clock strings ("2026-09-27T07:05"), with no
 * offset — providers commonly label local times as UTC, so an offset can't
 * be trusted and showing the wall-clock digits is the only reliably
 * correct thing. A field is null when the provider didn't report it; it is
 * never estimated or filled in here.
 */
export interface FlightLegStatus {
  airport: string | null;
  terminal: string | null;
  gate: string | null;
  scheduled: string | null;
  estimated: string | null;
  actual: string | null;
  delayMinutes: number | null;
}

export interface FlightStatusResult {
  flightNumber: string;
  airline: string | null;
  flightDate: string;
  status: FlightStatusCode;
  departure: FlightLegStatus;
  arrival: FlightLegStatus;
  provider: string;
}

export type FlightLookupErrorCode =
  | "invalid_request"
  | "missing_flight_date"
  | "provider_not_configured"
  | "flight_not_found"
  | "not_yet_available"
  | "ambiguous_flight"
  | "no_live_status"
  | "rate_limited"
  | "provider_unavailable";

/** Every "can't give you a real answer" case, so callers can tell them apart instead of showing a generic failure — or worse, made-up data. */
export class FlightLookupError extends Error {
  constructor(
    public readonly code: FlightLookupErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FlightLookupError";
  }
}

export type FlightStatusApiResponse =
  | { ok: true; status: FlightStatusResult }
  | { ok: false; error: { code: FlightLookupErrorCode; message: string } };

/** Provider abstraction for flight-status lookups, same pattern as WeatherProvider/ImageProvider. Throws FlightLookupError; never returns invented data. */
export interface FlightProvider {
  getStatus(request: FlightStatusRequest): Promise<FlightStatusResult>;
}
