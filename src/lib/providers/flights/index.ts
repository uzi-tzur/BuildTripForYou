import { AviationStackProvider } from "./aviationStack";
import { MockFlightProvider } from "./mockFlights";
import type { FlightProvider } from "./FlightProvider";

export type { FlightProvider, FlightStatusRequest, FlightStatusResult, FlightStatusCode } from "./FlightProvider";

export function getFlightProvider(): FlightProvider {
  return process.env.AVIATIONSTACK_API_KEY ? new AviationStackProvider() : new MockFlightProvider();
}
