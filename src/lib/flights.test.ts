import { describe, expect, it } from "vitest";
import { buildFlight, flightLabel, flightLookupCode, flightRoute, parseFlightCode } from "@/lib/flights";

describe("parseFlightCode", () => {
  it("splits airline code and number", () => {
    expect(parseFlightCode("AA1523")).toEqual({ airlineCode: "AA", flightNumber: "1523" });
    expect(parseFlightCode("aa 1523")).toEqual({ airlineCode: "AA", flightNumber: "1523" });
    expect(parseFlightCode("UA328")).toEqual({ airlineCode: "UA", flightNumber: "328" });
  });

  it("takes the airline code from the hint for a bare number, but not from a name", () => {
    expect(parseFlightCode("1523", "AA")).toEqual({ airlineCode: "AA", flightNumber: "1523" });
    expect(parseFlightCode("1523", "American Airlines")).toEqual({ airlineCode: null, flightNumber: "1523" });
  });

  it("rejects things that aren't flight numbers", () => {
    expect(parseFlightCode("not a flight")).toBeNull();
  });
});

describe("buildFlight", () => {
  it("builds the full model from an itinerary flight, with arrival on the same date", () => {
    const flight = buildFlight({
      date: "2026-09-27",
      time: "2026-09-27T07:05:00-05:00",
      flight: { airline: "AA", flightNumber: "1523", departureAirport: "DFW", arrivalAirport: "DEN", arrivalClock: "08:10:00-06:00" },
    });
    expect(flight).toEqual({
      airlineCode: "AA",
      flightNumber: "1523",
      departureAirport: "DFW",
      arrivalAirport: "DEN",
      flightDate: "2026-09-27",
      scheduledDeparture: "2026-09-27T07:05:00-05:00",
      scheduledArrival: "2026-09-27T08:10:00-06:00",
    });
    expect(flightLookupCode(flight!)).toBe("AA1523");
    expect(flightLabel(flight!)).toBe("AA 1523");
    expect(flightRoute(flight!)).toBe("DFW → DEN");
  });

  it("builds from a custom Airport activity and drops non-code airport names", () => {
    const flight = buildFlight({
      date: "2026-09-27",
      time: null,
      custom: { flightNumber: "UA328", airline: "United Airlines", airport: "Denver International" },
    });
    expect(flight).toMatchObject({ airlineCode: "UA", flightNumber: "328", departureAirport: null, scheduledDeparture: null });
  });

  it("returns null for a stop that isn't a flight", () => {
    expect(buildFlight({ date: "2026-09-27", time: null })).toBeNull();
  });

  it("can't produce a lookup code without an airline code", () => {
    const flight = buildFlight({ date: "2026-09-27", time: null, custom: { flightNumber: "1523", airline: "American" } });
    expect(flightLookupCode(flight!)).toBeNull();
  });
});
