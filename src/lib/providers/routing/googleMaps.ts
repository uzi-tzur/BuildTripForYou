import type { Route } from "@/lib/types";
import type { RouteMatrixRequest, RouteRequest, RoutingProvider } from "./RoutingProvider";

const TRAVEL_MODE_MAP: Record<string, string> = {
  driving: "DRIVE",
  walking: "WALK",
  transit: "TRANSIT",
  mixed: "DRIVE",
  flying: "DRIVE", // Routes API has no flight mode; flights aren't routable this way.
};

interface ComputeRoutesResponse {
  routes?: Array<{
    distanceMeters: number;
    duration: string; // e.g. "1234s"
    polyline?: { encodedPolyline?: string };
  }>;
}

function parseSeconds(duration: string | undefined): number {
  if (!duration) return 0;
  return Number(duration.replace(/s$/, "")) || 0;
}

/**
 * Google Maps Platform Routes API adapter — PRD Section 7. Requires
 * GOOGLE_MAPS_API_KEY (server-side only).
 */
export class GoogleMapsRoutingProvider implements RoutingProvider {
  private get apiKey(): string {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not set.");
    return key;
  }

  async calculateRoute(request: RouteRequest): Promise<Route> {
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: { address: request.origin },
        destination: { address: request.destination },
        intermediates: request.waypoints?.map((address) => ({ address })),
        travelMode: TRAVEL_MODE_MAP[request.travelMode] ?? "DRIVE",
        routingPreference: request.travelMode === "driving" ? "TRAFFIC_AWARE" : undefined,
        departureTime: request.departureTime,
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Routes computeRoutes failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as ComputeRoutesResponse;
    const route = data.routes?.[0];
    if (!route) throw new Error("Google Routes returned no route.");

    const durationSeconds = parseSeconds(route.duration);

    return {
      id: `google-${request.origin}-${request.destination}-${Date.now()}`,
      origin: request.origin,
      destination: request.destination,
      distanceMeters: route.distanceMeters,
      estimatedDurationSeconds: durationSeconds,
      trafficDurationSeconds: request.travelMode === "driving" ? durationSeconds : null,
      departureTime: request.departureTime ?? null,
      arrivalTime: null,
      provider: "google_routes",
      travelMode: request.travelMode,
      routeData: route.polyline ?? null,
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
