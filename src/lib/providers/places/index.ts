import { GooglePlacesProvider } from "./googlePlaces";
import { MockPlacesProvider } from "./mockPlaces";
import type { PlacesProvider } from "./PlacesProvider";

export type { PlacesProvider, PlaceDetailsRequest, SearchPlacesRequest } from "./PlacesProvider";

/**
 * Auto-selects the real Google Places adapter when GOOGLE_MAPS_API_KEY is
 * configured, otherwise a clearly-labeled mock adapter (PRD Rule 5 / Rule
 * 4 provider abstraction).
 */
export function getPlacesProvider(): PlacesProvider {
  return process.env.GOOGLE_MAPS_API_KEY ? new GooglePlacesProvider() : new MockPlacesProvider();
}
