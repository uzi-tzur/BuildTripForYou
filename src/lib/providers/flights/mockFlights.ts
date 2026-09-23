import type { FlightProvider, FlightStatusCode, FlightStatusRequest, FlightStatusResult } from "./FlightProvider";

const STATUSES: FlightStatusCode[] = ["scheduled", "active", "landed", "cancelled"];
const GATES = ["A12", "B4", "C22", "D8", "E15"];
const TERMINALS = ["1", "2", "3", "A", "B"];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  return hash;
}

/**
 * Deterministic demo flight status used when AVIATIONSTACK_API_KEY isn't
 * set. Stable per flight number so the UI is consistent across reloads,
 * but NOT a real status (PRD Rule 5) — always shown with a "Demo data" badge.
 */
export class MockFlightProvider implements FlightProvider {
  async getStatus(request: FlightStatusRequest): Promise<FlightStatusResult | null> {
    const flightNumber = request.flightNumber.replace(/\s+/g, "").toUpperCase();
    const seed = hashString(flightNumber);
    const scheduled = new Date();
    scheduled.setHours(scheduled.getHours() + (seed % 12), (seed % 4) * 15, 0, 0);
    const delayMinutes = seed % 3 === 0 ? 10 + (seed % 40) : 0;
    const estimated = new Date(scheduled.getTime() + delayMinutes * 60_000);

    return {
      flightNumber,
      airline: request.airline ?? null,
      status: STATUSES[seed % STATUSES.length]!,
      departureAirport: request.airport ?? null,
      departureScheduled: scheduled.toISOString(),
      departureEstimated: estimated.toISOString(),
      departureGate: GATES[seed % GATES.length]!,
      departureTerminal: TERMINALS[seed % TERMINALS.length]!,
      arrivalAirport: null,
      arrivalScheduled: null,
      provider: "mock",
    };
  }
}
