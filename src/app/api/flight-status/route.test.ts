import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function call(body: unknown) {
  return POST(new Request("http://localhost/api/flight-status", { method: "POST", body: JSON.stringify(body) }));
}

async function errorOf(body: unknown) {
  const res = await call(body);
  const json = (await res.json()) as { ok: boolean; error?: { code: string } };
  return { status: res.status, code: json.error?.code };
}

beforeEach(() => {
  process.env.AVIATIONSTACK_API_KEY = "test-key";
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.AVIATIONSTACK_API_KEY;
});

describe("POST /api/flight-status", () => {
  it("rejects a missing flight date", async () => {
    expect(await errorOf({ flightNumber: "AA1523" })).toEqual({ status: 400, code: "missing_flight_date" });
  });

  it("rejects malformed input", async () => {
    expect(await errorOf({ flightNumber: "AA1523", flightDate: "27/09/2026" })).toEqual({ status: 400, code: "invalid_request" });
    expect(await errorOf({ flightNumber: "not a flight", flightDate: "2026-09-27" })).toEqual({ status: 400, code: "invalid_request" });
    expect(await errorOf({ flightNumber: "AA1523", flightDate: "2026-09-27", departureAirport: "Dallas" })).toEqual({
      status: 400,
      code: "invalid_request",
    });
  });

  it("says the feature isn't set up — instead of inventing data — when there is no provider key", async () => {
    delete process.env.AVIATIONSTACK_API_KEY;
    expect(await errorOf({ flightNumber: "AA1523", flightDate: "2026-09-27" })).toEqual({ status: 503, code: "provider_not_configured" });
  });

  it("returns a normalized status on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                flight_date: "2026-09-27",
                flight_status: "scheduled",
                departure: { iata: "DFW", scheduled: "2026-09-27T07:05:00+00:00" },
                arrival: { iata: "DEN", scheduled: "2026-09-27T08:10:00+00:00" },
                airline: { name: "American Airlines" },
                flight: { iata: "AA1523" },
              },
            ],
          }),
        ),
      ),
    );
    const res = await call({ flightNumber: "aa 1523", flightDate: "2026-09-27", departureAirport: "dfw", arrivalAirport: "DEN" });
    const json = (await res.json()) as { ok: boolean; status: { flightNumber: string; departure: { scheduled: string } } };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.status).toMatchObject({ flightNumber: "AA1523", departure: { scheduled: "2026-09-27T07:05" } });
  });

  it("maps provider errors to their HTTP status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 429 })));
    expect(await errorOf({ flightNumber: "AA1523", flightDate: "2026-09-27" })).toEqual({ status: 429, code: "rate_limited" });
  });
});
