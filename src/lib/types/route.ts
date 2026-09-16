import type { TransportationMode } from "./common";

/** PRD Section 39 — Route entity, covering Section 6 "Travel Time Intelligence". */
export interface Route {
  id: string;
  origin: string;
  destination: string;
  distanceMeters: number;
  estimatedDurationSeconds: number;
  trafficDurationSeconds: number | null;
  departureTime: string | null;
  arrivalTime: string | null;
  provider: string;
  travelMode: TransportationMode;
  routeData: unknown;
  calculatedAt: string;
}
