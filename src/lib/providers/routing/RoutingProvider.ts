import type { Route, TransportationMode } from "@/lib/types";

export interface RouteRequest {
  origin: string;
  destination: string;
  waypoints?: string[];
  travelMode: TransportationMode;
  departureTime?: string;
}

export interface RouteMatrixRequest {
  origins: string[];
  destinations: string[];
  travelMode: TransportationMode;
}

/**
 * PRD Section 43 — provider abstraction. Never call Google Maps (or any
 * routing vendor) directly from application code; depend on this interface
 * instead, so the provider can be swapped without touching callers.
 */
export interface RoutingProvider {
  calculateRoute(request: RouteRequest): Promise<Route>;
  calculateRouteMatrix(request: RouteMatrixRequest): Promise<Route[]>;
}
