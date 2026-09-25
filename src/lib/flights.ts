import type { FlightInfo } from "@/data/coloradoTrip";

/**
 * A flight as the itinerary knows it, in one shape regardless of where it
 * came from (a built-in itinerary flight or a custom Airport activity).
 */
export interface Flight {
  /** IATA airline code ("AA"), or null when the itinerary only has a bare number. */
  airlineCode: string | null;
  /** The number without the airline code ("1523"). */
  flightNumber: string;
  departureAirport: string | null;
  arrivalAirport: string | null;
  /** Departure date, YYYY-MM-DD. */
  flightDate: string;
  /** ISO 8601 with the departure airport's offset, or null if the itinerary has no time for it. */
  scheduledDeparture: string | null;
  /** ISO 8601 with the arrival airport's offset, or null when the itinerary doesn't say. */
  scheduledArrival: string | null;
}

export interface FlightSource {
  /** The stop's effective date (YYYY-MM-DD) — after any user edit. */
  date: string;
  /** The stop's effective time (ISO with offset), or null. */
  time: string | null;
  flight?: FlightInfo;
  custom?: { flightNumber?: string | null; airline?: string | null; airport?: string | null } | null;
}

const AIRLINE_CODE = /^[A-Z0-9]{2}$/;
const THREE_LETTER = /^[A-Z]{3}$/;

/** "AA1523" -> AA + 1523; a bare "1523" takes the airline code from the separate airline field if it is one. */
export function parseFlightCode(raw: string, airlineHint?: string | null): { airlineCode: string | null; flightNumber: string } | null {
  const cleaned = raw.replace(/[\s-]/g, "").toUpperCase();
  if (/^\d{1,4}[A-Z]?$/.test(cleaned)) {
    const hint = airlineHint?.trim().toUpperCase() ?? "";
    return { airlineCode: AIRLINE_CODE.test(hint) ? hint : null, flightNumber: cleaned };
  }
  const match = /^([A-Z0-9]{2})(\d{1,4}[A-Z]?)$/.exec(cleaned);
  return match ? { airlineCode: match[1]!, flightNumber: match[2]! } : null;
}

function airportCode(value: string | null | undefined): string | null {
  const code = value?.trim().toUpperCase() ?? "";
  return THREE_LETTER.test(code) ? code : null;
}

/** Returns null for a stop that isn't a flight. */
export function buildFlight(source: FlightSource): Flight | null {
  if (source.flight) {
    return {
      airlineCode: source.flight.airline,
      flightNumber: source.flight.flightNumber,
      departureAirport: source.flight.departureAirport,
      arrivalAirport: source.flight.arrivalAirport,
      flightDate: source.date,
      scheduledDeparture: source.time,
      scheduledArrival: `${source.date}T${source.flight.arrivalClock}`,
    };
  }
  if (source.custom?.flightNumber) {
    const parsed = parseFlightCode(source.custom.flightNumber, source.custom.airline);
    if (!parsed) return null;
    return {
      ...parsed,
      // Free-text airport names ("Denver International") can't be matched against a provider — only 3-letter codes are used.
      departureAirport: airportCode(source.custom.airport),
      arrivalAirport: null,
      flightDate: source.date,
      scheduledDeparture: source.time,
      scheduledArrival: null,
    };
  }
  return null;
}

/** "AA1523" — what a provider is queried with. Null when the airline code is unknown, since a bare number can't be looked up. */
export function flightLookupCode(flight: Flight): string | null {
  return flight.airlineCode ? `${flight.airlineCode}${flight.flightNumber}` : null;
}

/** "AA 1523" — how the itinerary displays it. */
export function flightLabel(flight: Flight): string {
  return flight.airlineCode ? `${flight.airlineCode} ${flight.flightNumber}` : flight.flightNumber;
}

/** "DFW → DEN", or just the known side. */
export function flightRoute(flight: Flight): string | null {
  const { departureAirport: from, arrivalAirport: to } = flight;
  if (from && to) return `${from} → ${to}`;
  return from ?? to ?? null;
}
