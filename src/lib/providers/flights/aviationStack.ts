import type { FlightProvider, FlightStatusCode, FlightStatusRequest, FlightStatusResult } from "./FlightProvider";

interface AviationStackFlight {
  flight_date?: string;
  flight_status?: string;
  departure?: { iata?: string; terminal?: string; gate?: string; delay?: number | null; scheduled?: string; estimated?: string };
  arrival?: { iata?: string; scheduled?: string };
  airline?: { name?: string };
  flight?: { iata?: string };
}

interface AviationStackResponse {
  data: AviationStackFlight[];
}

const KNOWN_STATUSES: FlightStatusCode[] = ["scheduled", "active", "landed", "cancelled", "diverted", "incident"];

/** AviationStack labels airport-local times "+00:00" — keep only the wall-clock digits ("2026-09-27T07:05"). */
function localWallClock(value: string | undefined): string | null {
  return value ? value.slice(0, 16) : null;
}

/**
 * AviationStack flight-status API — free tier only supports plain HTTP
 * (not HTTPS), which is fine here since this call happens server-side
 * (see /api/flight-status), never from the browser. Requires AVIATIONSTACK_API_KEY.
 *
 * The free tier returns live/recent flights, not a future date's schedule, so
 * the result carries its own flightDate for the caller to compare against
 * the itinerary's date rather than pretending it answers for the requested day.
 */
export class AviationStackProvider implements FlightProvider {
  private get apiKey(): string {
    const key = process.env.AVIATIONSTACK_API_KEY;
    if (!key) throw new Error("AVIATIONSTACK_API_KEY is not set.");
    return key;
  }

  async getStatus(request: FlightStatusRequest): Promise<FlightStatusResult | null> {
    const url = new URL("http://api.aviationstack.com/v1/flights");
    url.searchParams.set("access_key", this.apiKey);
    url.searchParams.set("flight_iata", request.flightNumber.replace(/\s+/g, "").toUpperCase());

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`AviationStack flight lookup failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as AviationStackResponse;
    const flights = data.data ?? [];
    // Prefer the entry for the itinerary's date when the API returns several.
    const flight = (request.departureDate && flights.find((f) => f.flight_date === request.departureDate)) || flights[0];
    if (!flight) return null;

    const status = flight.flight_status?.toLowerCase();
    return {
      flightNumber: flight.flight?.iata ?? request.flightNumber,
      airline: flight.airline?.name ?? request.airline ?? null,
      flightDate: flight.flight_date ?? null,
      status: (KNOWN_STATUSES as string[]).includes(status ?? "") ? (status as FlightStatusCode) : "unknown",
      departureAirport: flight.departure?.iata ?? request.airport ?? null,
      departureScheduled: localWallClock(flight.departure?.scheduled),
      departureEstimated: localWallClock(flight.departure?.estimated),
      departureDelayMinutes: flight.departure?.delay ?? null,
      departureGate: flight.departure?.gate ?? null,
      departureTerminal: flight.departure?.terminal ?? null,
      arrivalAirport: flight.arrival?.iata ?? null,
      arrivalScheduled: localWallClock(flight.arrival?.scheduled),
      provider: "aviationstack",
    };
  }
}
