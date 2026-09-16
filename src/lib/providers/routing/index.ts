import { GoogleMapsRoutingProvider } from "./googleMaps";
import { MockRoutingProvider } from "./mockRouting";
import type { RoutingProvider } from "./RoutingProvider";

export type { RoutingProvider, RouteRequest, RouteMatrixRequest } from "./RoutingProvider";

export function getRoutingProvider(): RoutingProvider {
  return process.env.GOOGLE_MAPS_API_KEY ? new GoogleMapsRoutingProvider() : new MockRoutingProvider();
}
