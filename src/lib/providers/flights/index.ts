import { AviationStackProvider } from "./aviationStack";
import type { FlightProvider } from "./FlightProvider";

export { FlightLookupError } from "./FlightProvider";
export type {
  FlightLegStatus,
  FlightLookupErrorCode,
  FlightProvider,
  FlightStatusApiResponse,
  FlightStatusCode,
  FlightStatusRequest,
  FlightStatusResult,
} from "./FlightProvider";

/**
 * Unlike the weather/image providers there is deliberately no mock fallback:
 * a made-up flight status (gate, delay, cancellation) could send someone
 * to the wrong place, so with no key configured this returns null and the
 * caller reports the feature as not set up.
 */
export function getFlightProvider(): FlightProvider | null {
  return process.env.AVIATIONSTACK_API_KEY ? new AviationStackProvider() : null;
}
