import type { FlightProvider, FlightStatusCode, FlightStatusRequest, FlightStatusResult } from "./FlightProvider";

interface AviationStackFlight {
  flight_status?: string;
  departure?: { iata?: string; terminal?: string; gate?: string; scheduled?: string; estimated?: string };
  arrival?: { iata?: string; scheduled?: string };
  airline?: { name?: string };
  flight?: { iata?: string };
}

interface AviationStackResponse {
  data: AviationStackFlight[];
}

const KNOWN_STATUSES: FlightStatusCode[] = ["scheduled", "active", "landed", "cancelled", "diverted", "incident"];

/**
 * AviationStack flight-status API — free tier only supports plain HTTP
 * (not HTTPS), which is fine here since this call happens server-side
 * (see /api/flight-status), never from the browser. Requires AVIATIONSTACK_API_KEY.
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
    const flight = data.data?.[0];
    if (!flight) return null;

    const status = flight.flight_status?.toLowerCase();
    return {
      flightNumber: flight.flight?.iata ?? request.flightNumber,
      airline: flight.airline?.name ?? request.airline ?? null,
      status: (KNOWN_STATUSES as string[]).includes(status ?? "") ? (status as FlightStatusCode) : "unknown",
      departureAirport: flight.departure?.iata ?? request.airport ?? null,
      departureScheduled: flight.departure?.scheduled ?? null,
      departureEstimated: flight.departure?.estimated ?? null,
      departureGate: flight.departure?.gate ?? null,
      departureTerminal: flight.departure?.terminal ?? null,
      arrivalAirport: flight.arrival?.iata ?? null,
      arrivalScheduled: flight.arrival?.scheduled ?? null,
      provider: "aviationstack",
    };
  }
}
