import type { ConfidenceLevel, Destination } from "@/lib/types";
import type { PlaceDetailsRequest, PlacesProvider, SearchPlacesRequest } from "./PlacesProvider";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.priceLevel",
  "places.regularOpeningHours",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.primaryTypeDisplayName",
  "places.editorialSummary",
  "places.photos",
].join(",");

const PRICE_LEVEL_TO_USD: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 15,
  PRICE_LEVEL_MODERATE: 35,
  PRICE_LEVEL_EXPENSIVE: 75,
  PRICE_LEVEL_VERY_EXPENSIVE: 150,
};

interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  priceLevel?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  internationalPhoneNumber?: string;
  websiteUri?: string;
  primaryTypeDisplayName?: { text?: string };
  editorialSummary?: { text?: string };
  photos?: { name: string }[];
}

/**
 * Google Places API ("New") adapter — PRD Section 7/5.2. Requires
 * GOOGLE_MAPS_API_KEY (server-side only).
 */
export class GooglePlacesProvider implements PlacesProvider {
  private get apiKey(): string {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not set.");
    return key;
  }

  async searchPlaces(request: SearchPlacesRequest): Promise<Destination[]> {
    const body: Record<string, unknown> = { textQuery: request.query };
    if (request.latitude !== undefined && request.longitude !== undefined) {
      body.locationBias = {
        circle: {
          center: { latitude: request.latitude, longitude: request.longitude },
          radius: request.radiusMeters ?? 20000,
        },
      };
    }

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Google Places searchText failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as { places?: GooglePlace[] };
    return (data.places ?? []).map(toDestination);
  }

  async getPlaceDetails(request: PlaceDetailsRequest): Promise<Destination> {
    const response = await fetch(`https://places.googleapis.com/v1/places/${request.placeId}`, {
      headers: {
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": FIELD_MASK.replace(/places\./g, ""),
      },
    });

    if (!response.ok) {
      throw new Error(`Google Places details failed: ${response.status} ${await response.text()}`);
    }

    const place = (await response.json()) as GooglePlace;
    return toDestination(place);
  }
}

function toDestination(place: GooglePlace): Destination {
  const confidence: ConfidenceLevel = "verified";
  return {
    id: place.id,
    name: place.displayName?.text ?? "Unknown place",
    description: place.editorialSummary?.text ?? "",
    category: place.primaryTypeDisplayName?.text ?? "Attraction",
    address: place.formattedAddress ?? "",
    latitude: place.location?.latitude ?? 0,
    longitude: place.location?.longitude ?? 0,
    phone: place.internationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    imageUrl: place.photos?.[0] ? `/api/places/photo?name=${encodeURIComponent(place.photos[0].name)}` : null,
    rating: place.rating ?? null,
    price: place.priceLevel ? (PRICE_LEVEL_TO_USD[place.priceLevel] ?? null) : null,
    openingHours: place.regularOpeningHours?.weekdayDescriptions?.join("; ") ?? null,
    reservationRequired: false,
    recommendedDurationMinutes: null,
    bookingUrl: null,
    bestTimeToVisit: null,
    source: "google_places",
    lastVerifiedAt: new Date().toISOString(),
    freshness: { source: "google_places", lastVerifiedAt: new Date().toISOString(), confidence },
  };
}
