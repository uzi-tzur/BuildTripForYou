import {
  FlightLookupError,
  type FlightLegStatus,
  type FlightProvider,
  type FlightStatusCode,
  type FlightStatusRequest,
  type FlightStatusResult,
} from "./FlightProvider";

interface AviationStackLeg {
  iata?: string | null;
  terminal?: string | null;
  gate?: string | null;
  delay?: number | null;
  scheduled?: string | null;
  estimated?: string | null;
  actual?: string | null;
}

interface AviationStackFlight {
  flight_date?: string;
  flight_status?: string;
  departure?: AviationStackLeg;
  arrival?: AviationStackLeg;
  airline?: { name?: string | null };
  flight?: { iata?: string | null; codeshared?: unknown };
}

interface AviationStackResponse {
  data?: AviationStackFlight[];
  error?: { code?: string; message?: string };
}

const RATE_LIMIT_CODES = new Set(["rate_limit_reached", "usage_limit_reached"]);
const KEY_PROBLEM_CODES = new Set(["invalid_access_key", "missing_access_key", "inactive_user"]);

const STATUS_MAP: Record<string, FlightStatusCode> = {
  scheduled: "scheduled",
  active: "departed",
  landed: "landed",
  cancelled: "cancelled",
  diverted: "diverted",
  incident: "incident",
};

/** AviationStack labels airport-local times "+00:00" — keep only the wall-clock digits ("2026-09-27T07:05"). */
function localWallClock(value: string | null | undefined): string | null {
  return value ? value.slice(0, 16) : null;
}

function toLeg(leg: AviationStackLeg | undefined): FlightLegStatus {
  return {
    airport: leg?.iata ?? null,
    terminal: leg?.terminal ?? null,
    gate: leg?.gate ?? null,
    scheduled: localWallClock(leg?.scheduled),
    estimated: localWallClock(leg?.estimated),
    actual: localWallClock(leg?.actual),
    delayMinutes: leg?.delay ?? null,
  };
}

function sameAirport(actual: string | null | undefined, wanted: string | null | undefined): boolean {
  return !wanted || (actual ?? "").toUpperCase() === wanted.toUpperCase();
}

function routeLabel(f: AviationStackFlight): string {
  return `${f.departure?.iata ?? "?"} → ${f.arrival?.iata ?? "?"}`;
}

/**
 * AviationStack flight-status API. The free tier is plain HTTP only (fine
 * here: the call is server-side, from /api/flight-status, never the
 * browser) and covers live/recent flights, not a future date's schedule —
 * so a date it has no entry for is reported as "not available yet" rather
 * than answered with a different day's flight. Requires AVIATIONSTACK_API_KEY.
 */
export class AviationStackProvider implements FlightProvider {
  private get apiKey(): string {
    const key = process.env.AVIATIONSTACK_API_KEY;
    if (!key) throw new FlightLookupError("provider_not_configured", "Live flight status isn't set up on this server.");
    return key;
  }

  async getStatus(request: FlightStatusRequest): Promise<FlightStatusResult> {
    const flightNumber = request.flightNumber.replace(/\s+/g, "").toUpperCase();
    const url = new URL("http://api.aviationstack.com/v1/flights");
    url.searchParams.set("access_key", this.apiKey);
    url.searchParams.set("flight_iata", flightNumber);

    let response: Response;
    try {
      response = await fetch(url, { cache: "no-store" });
    } catch {
      throw new FlightLookupError("provider_unavailable", "The flight-status service couldn't be reached.");
    }

    if (response.status === 429) {
      throw new FlightLookupError("rate_limited", "The flight-status lookup limit has been reached — try again later.");
    }

    let body: AviationStackResponse;
    try {
      body = (await response.json()) as AviationStackResponse;
    } catch {
      throw new FlightLookupError("provider_unavailable", "The flight-status service returned an unreadable response.");
    }

    if (body.error) {
      const code = body.error.code ?? "";
      if (RATE_LIMIT_CODES.has(code)) {
        throw new FlightLookupError("rate_limited", "The flight-status lookup limit has been reached — try again later.");
      }
      if (KEY_PROBLEM_CODES.has(code)) {
        throw new FlightLookupError("provider_not_configured", "The flight-status service rejected this server's access key.");
      }
      throw new FlightLookupError("provider_unavailable", "The flight-status service reported an error.");
    }
    if (!response.ok) {
      throw new FlightLookupError("provider_unavailable", "The flight-status service is unavailable right now.");
    }

    const all = body.data ?? [];
    if (all.length === 0) {
      throw new FlightLookupError("flight_not_found", `No flight ${flightNumber} was found.`);
    }

    const onDate = all.filter((f) => f.flight_date === request.flightDate);
    if (onDate.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      if (request.flightDate > today) {
        throw new FlightLookupError(
          "not_yet_available",
          `Live status for ${flightNumber} on ${request.flightDate} isn't available yet — check again closer to departure.`,
        );
      }
      throw new FlightLookupError("no_live_status", `Live status for ${flightNumber} on ${request.flightDate} is no longer available.`);
    }

    // A codeshare listing is the same aircraft sold under another airline's code — prefer the operating flight's own record.
    const operating = onDate.filter((f) => !f.flight?.codeshared);
    const candidates = operating.length > 0 ? operating : onDate;

    const onRoute = candidates.filter(
      (f) => sameAirport(f.departure?.iata, request.departureAirport) && sameAirport(f.arrival?.iata, request.arrivalAirport),
    );
    if (onRoute.length === 0) {
      const wanted = [request.departureAirport, request.arrivalAirport].filter(Boolean).join(" → ");
      throw new FlightLookupError("flight_not_found", `${flightNumber} on ${request.flightDate} isn't listed for ${wanted}.`);
    }

    const distinct = new Map(onRoute.map((f) => [`${routeLabel(f)}|${f.departure?.scheduled ?? ""}`, f]));
    if (distinct.size > 1) {
      const routes = [...distinct.values()].map(routeLabel).join(", ");
      throw new FlightLookupError(
        "ambiguous_flight",
        `${flightNumber} has more than one flight on ${request.flightDate} (${routes}) — add the airports to pick one.`,
      );
    }
    const flight = [...distinct.values()][0]!;

    const departure = toLeg(flight.departure);
    const arrival = toLeg(flight.arrival);
    const status = STATUS_MAP[flight.flight_status?.toLowerCase() ?? ""] ?? "unknown";
    const hasAnyTime = [departure, arrival].some((l) => l.scheduled || l.estimated || l.actual);
    if (status === "unknown" && !hasAnyTime) {
      throw new FlightLookupError("no_live_status", `The provider has no live status for ${flightNumber} yet.`);
    }

    return {
      flightNumber: flight.flight?.iata ?? flightNumber,
      airline: flight.airline?.name ?? null,
      flightDate: request.flightDate,
      status,
      departure,
      arrival,
      provider: "aviationstack",
    };
  }
}
