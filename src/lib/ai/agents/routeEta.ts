import { NotImplementedError } from "@/lib/errors";
import type { Route } from "@/lib/types";

/**
 * Route & ETA Agent (PRD Section 19). Calculates routes and travel times
 * via the RoutingProvider. Wired up in Phase 6.
 */
export async function calculateEta(_origin: string, _destination: string): Promise<Route> {
  throw new NotImplementedError("routeEtaAgent.calculateEta");
}
