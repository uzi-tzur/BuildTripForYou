import type { FlightProvider, FlightStatusCode, FlightStatusRequest, FlightStatusResult } from "./FlightProvider";

const GATES = ["A12", "B4", "C21", "D8", "E15"];
const TERMINALS = ["A", "B", "C", "D", "E"];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  return hash;
}

function addMinutes(wallClock: string, minutes: number): string {
  const [datePart, timePart] = wallClock.split("T") as [string, string];
  const [y, mo, d] = datePart.split("-").map(Number) as [number, number, number];
  const [h, mi] = timePart.split(":").map(Number) as [number, number];
  const t = new Date(Date.UTC(y, mo - 1, d, h, mi + minutes));
  return t.toISOString().slice(0, 16);
}

/**
 * Deterministic demo flight status used when AVIATIONSTACK_API_KEY isn't
 * set. Stable per flight number, built around the itinerary's own
 * date/time so the demo reads like the real flight — but NOT a real
 * status (PRD Rule 5), always shown with a "Demo data" badge.
 */
export class MockFlightProvider implements FlightProvider {
  async getStatus(request: FlightStatusRequest): Promise<FlightStatusResult | null> {
    const flightNumber = request.flightNumber.replace(/\s+/g, "").toUpperCase();
    const seed = hashString(flightNumber);
    const date = request.departureDate ?? new Date().toISOString().slice(0, 10);
    const scheduled = `${date}T${request.departureTime ?? "12:00"}`;
    const delayMinutes = seed % 3 === 0 ? 15 + (seed % 76) : 0;
    const status: FlightStatusCode = seed % 17 === 0 ? "cancelled" : "scheduled";

    return {
      flightNumber,
      airline: request.airline ?? null,
      flightDate: date,
      status,
      departureAirport: request.airport ?? null,
      departureScheduled: scheduled,
      departureEstimated: delayMinutes > 0 ? addMinutes(scheduled, delayMinutes) : scheduled,
      departureDelayMinutes: delayMinutes,
      departureGate: GATES[seed % GATES.length]!,
      departureTerminal: TERMINALS[seed % TERMINALS.length]!,
      arrivalAirport: null,
      arrivalScheduled: null,
      provider: "mock",
    };
  }
}
