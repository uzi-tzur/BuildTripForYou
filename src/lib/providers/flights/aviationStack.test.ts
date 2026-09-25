import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlightLookupError } from "./FlightProvider";
import { AviationStackProvider } from "./aviationStack";

const REQUEST = { flightNumber: "AA1523", flightDate: "2026-09-27", departureAirport: "DFW", arrivalAirport: "DEN" };

function entry(over: Record<string, unknown> = {}) {
  return {
    flight_date: "2026-09-27",
    flight_status: "scheduled",
    departure: { iata: "DFW", terminal: "C", gate: "21", delay: 15, scheduled: "2026-09-27T07:05:00+00:00", estimated: "2026-09-27T07:20:00+00:00", actual: null },
    arrival: { iata: "DEN", terminal: "B", gate: "32", delay: null, scheduled: "2026-09-27T08:10:00+00:00", estimated: null, actual: null },
    airline: { name: "American Airlines" },
    flight: { iata: "AA1523", codeshared: null },
    ...over,
  };
}

function respond(body: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));
}

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error instanceof FlightLookupError ? error.code : `unexpected: ${String(error)}`;
  }
}

beforeEach(() => {
  process.env.AVIATIONSTACK_API_KEY = "test-key";
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.AVIATIONSTACK_API_KEY;
  vi.useRealTimers();
});

describe("AviationStackProvider", () => {
  it("normalizes a matching flight, keeping airport-local wall-clock times and reporting only what was given", async () => {
    respond({ data: [entry()] });
    const result = await new AviationStackProvider().getStatus(REQUEST);
    expect(result).toMatchObject({
      flightNumber: "AA1523",
      airline: "American Airlines",
      flightDate: "2026-09-27",
      status: "scheduled",
      provider: "aviationstack",
      departure: { airport: "DFW", terminal: "C", gate: "21", scheduled: "2026-09-27T07:05", estimated: "2026-09-27T07:20", actual: null, delayMinutes: 15 },
      arrival: { airport: "DEN", terminal: "B", gate: "32", scheduled: "2026-09-27T08:10", estimated: null, actual: null, delayMinutes: null },
    });
  });

  it("maps an active flight to departed", async () => {
    respond({ data: [entry({ flight_status: "active" })] });
    expect((await new AviationStackProvider().getStatus(REQUEST)).status).toBe("departed");
  });

  it("reports flight_not_found when the provider has no such flight", async () => {
    respond({ data: [] });
    expect(await codeOf(new AviationStackProvider().getStatus(REQUEST))).toBe("flight_not_found");
  });

  it("reports not_yet_available — not another day's flight — for a future date it has no entry for", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-20T12:00:00Z"));
    respond({ data: [entry({ flight_date: "2026-09-20" })] });
    expect(await codeOf(new AviationStackProvider().getStatus(REQUEST))).toBe("not_yet_available");
  });

  it("reports no_live_status for a past date it no longer has", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-05T12:00:00Z"));
    respond({ data: [entry({ flight_date: "2026-10-04" })] });
    expect(await codeOf(new AviationStackProvider().getStatus(REQUEST))).toBe("no_live_status");
  });

  it("reports flight_not_found when the flight exists but not on the requested route", async () => {
    respond({ data: [entry({ departure: { iata: "ORD" } })] });
    expect(await codeOf(new AviationStackProvider().getStatus(REQUEST))).toBe("flight_not_found");
  });

  it("reports ambiguous_flight when several distinct flights match and no airports narrow it", async () => {
    respond({
      data: [entry(), entry({ departure: { iata: "DEN", scheduled: "2026-09-27T13:17:00+00:00" }, arrival: { iata: "DFW" } })],
    });
    const provider = new AviationStackProvider();
    expect(await codeOf(provider.getStatus({ flightNumber: "AA1523", flightDate: "2026-09-27" }))).toBe("ambiguous_flight");
    // ...and the airports resolve it.
    respond({
      data: [entry(), entry({ departure: { iata: "DEN", scheduled: "2026-09-27T13:17:00+00:00" }, arrival: { iata: "DFW" } })],
    });
    expect((await provider.getStatus(REQUEST)).departure.airport).toBe("DFW");
  });

  it("prefers the operating flight over a codeshare listing", async () => {
    respond({ data: [entry({ flight: { iata: "AA1523", codeshared: { airline_iata: "ba" } }, departure: { iata: "DFW", gate: "99" } }), entry()] });
    expect((await new AviationStackProvider().getStatus(REQUEST)).departure.gate).toBe("21");
  });

  it("reports rate_limited for HTTP 429 and for the provider's usage-limit error body", async () => {
    respond({}, 429);
    expect(await codeOf(new AviationStackProvider().getStatus(REQUEST))).toBe("rate_limited");
    respond({ error: { code: "usage_limit_reached", message: "limit" } }, 200);
    expect(await codeOf(new AviationStackProvider().getStatus(REQUEST))).toBe("rate_limited");
  });

  it("reports provider_not_configured when the provider rejects the key", async () => {
    respond({ error: { code: "invalid_access_key" } }, 401);
    expect(await codeOf(new AviationStackProvider().getStatus(REQUEST))).toBe("provider_not_configured");
  });

  it("reports provider_unavailable for network failures, server errors, and unreadable bodies", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await codeOf(new AviationStackProvider().getStatus(REQUEST))).toBe("provider_unavailable");
    respond({}, 500);
    expect(await codeOf(new AviationStackProvider().getStatus(REQUEST))).toBe("provider_unavailable");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })));
    expect(await codeOf(new AviationStackProvider().getStatus(REQUEST))).toBe("provider_unavailable");
  });

  it("reports no_live_status when the provider has neither a status nor any times", async () => {
    respond({ data: [entry({ flight_status: null, departure: { iata: "DFW" }, arrival: { iata: "DEN" } })] });
    expect(await codeOf(new AviationStackProvider().getStatus(REQUEST))).toBe("no_live_status");
  });
});
