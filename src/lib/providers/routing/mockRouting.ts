import type { Route } from "@/lib/types";
import type { RouteMatrixRequest, RouteRequest, RoutingProvider } from "./RoutingProvider";

const AVERAGE_SPEED_KPH: Record<string, number> = {
  driving: 88, // ~55 mph
  walking: 5,
  transit: 40,
  flying: 700,
  mixed: 60,
};

/** Very rough haversine-distance estimate — no real traffic/road data. */
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Deterministic placeholder used when GOOGLE_MAPS_API_KEY isn't set. Since
 * we don't have real geocoding either without a key, distance/duration
 * are derived from a fixed reference point per string so results stay
 * stable across calls — NOT a real distance (PRD Rule 5 — never present
 * as fact; callers must show this as estimated/demo data).
 */
export class MockRoutingProvider implements RoutingProvider {
  async calculateRoute(request: RouteRequest): Promise<Route> {
    const distanceMeters = pseudoDistanceMeters(request.origin, request.destination);
    const speedKph = AVERAGE_SPEED_KPH[request.travelMode] ?? 60;
    const estimatedDurationSeconds = Math.round((distanceMeters / 1000 / speedKph) * 3600);

    return {
      id: `mock-route-${hashString(request.origin + request.destination)}`,
      origin: request.origin,
      destination: request.destination,
      distanceMeters,
      estimatedDurationSeconds,
      trafficDurationSeconds: null,
      departureTime: request.departureTime ?? null,
      arrivalTime: null,
      provider: "mock",
      travelMode: request.travelMode,
      routeData: null,
      calculatedAt: new Date().toISOString(),
    };
  }

  async calculateRouteMatrix(request: RouteMatrixRequest): Promise<Route[]> {
    const routes: Route[] = [];
    for (const origin of request.origins) {
      for (const destination of request.destinations) {
        routes.push(await this.calculateRoute({ origin, destination, travelMode: request.travelMode }));
      }
    }
    return routes;
  }
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pseudoDistanceMeters(origin: string, destination: string): number {
  // No geocoding available without an API key — derive a stable
  // "distance" from a hash of the two strings, in a plausible road-trip
  // range (8–650 km), rather than pretending to compute real geography.
  const combined = hashString(`${origin}->${destination}`);
  const km = 8 + (combined % 6420) / 10;
  return Math.round(km * 1000);
}

// Exported for reuse (e.g. weather provider location fallback) without
// duplicating the haversine helper.
export { haversineMeters };
