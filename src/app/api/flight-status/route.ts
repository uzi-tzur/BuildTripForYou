import { NextResponse } from "next/server";
import {
  FlightLookupError,
  getFlightProvider,
  type FlightLookupErrorCode,
  type FlightStatusApiResponse,
} from "@/lib/providers/flights";

/**
 * Flight status lookup for the no-login trip companion (/my-trip). Called
 * client-side per check, same pattern as /api/mytrip-weather and
 * /api/image-search — it's just the one place AVIATIONSTACK_API_KEY is
 * allowed to be used, and it sits behind the /my-trip access-code gate
 * (src/middleware.ts).
 */
const HTTP_STATUS: Record<FlightLookupErrorCode, number> = {
  invalid_request: 400,
  missing_flight_date: 400,
  provider_not_configured: 503,
  flight_not_found: 404,
  not_yet_available: 404,
  ambiguous_flight: 409,
  no_live_status: 404,
  rate_limited: 429,
  provider_unavailable: 502,
};

const FLIGHT_NUMBER = /^[A-Z0-9]{2}\d{1,4}[A-Z]?$/;
const AIRPORT_CODE = /^[A-Z]{3}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function fail(code: FlightLookupErrorCode, message: string) {
  const body: FlightStatusApiResponse = { ok: false, error: { code, message } };
  return NextResponse.json(body, { status: HTTP_STATUS[code] });
}

function airport(value: unknown): string | null | "invalid" {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const code = value.trim().toUpperCase();
  return AIRPORT_CODE.test(code) ? code : "invalid";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    flightNumber?: unknown;
    flightDate?: unknown;
    departureAirport?: unknown;
    arrivalAirport?: unknown;
  };

  if (typeof body.flightDate !== "string" || body.flightDate.trim() === "") {
    return fail("missing_flight_date", "A flight date is needed to check status.");
  }
  const flightDate = body.flightDate.trim();
  if (!DATE.test(flightDate)) return fail("invalid_request", "flightDate must be YYYY-MM-DD.");

  const flightNumber = typeof body.flightNumber === "string" ? body.flightNumber.replace(/\s+/g, "").toUpperCase() : "";
  if (!FLIGHT_NUMBER.test(flightNumber)) {
    return fail("invalid_request", "Enter the flight number with its airline code, e.g. AA1523.");
  }

  const departureAirport = airport(body.departureAirport);
  const arrivalAirport = airport(body.arrivalAirport);
  if (departureAirport === "invalid" || arrivalAirport === "invalid") {
    return fail("invalid_request", "Airports must be 3-letter codes, e.g. DFW.");
  }

  const provider = getFlightProvider();
  if (!provider) return fail("provider_not_configured", "Live flight status isn't set up on this server yet.");

  try {
    const status = await provider.getStatus({ flightNumber, flightDate, departureAirport, arrivalAirport });
    const payload: FlightStatusApiResponse = { ok: true, status };
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof FlightLookupError) return fail(error.code, error.message);
    return fail("provider_unavailable", "The flight-status service failed unexpectedly.");
  }
}
