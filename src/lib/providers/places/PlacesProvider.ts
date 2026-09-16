import type { Destination } from "@/lib/types";

export interface SearchPlacesRequest {
  query: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  category?: string;
}

export interface PlaceDetailsRequest {
  placeId: string;
}

/** PRD Section 43 — provider abstraction for destination intelligence (Section 5.2). */
export interface PlacesProvider {
  searchPlaces(request: SearchPlacesRequest): Promise<Destination[]>;
  getPlaceDetails(request: PlaceDetailsRequest): Promise<Destination>;
}
