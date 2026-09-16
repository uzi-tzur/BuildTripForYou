import type { Destination } from "@/lib/types";
import type { PlaceDetailsRequest, PlacesProvider, SearchPlacesRequest } from "./PlacesProvider";

/**
 * Deterministic demo data used when GOOGLE_MAPS_API_KEY is not set (PRD
 * Rule 5 — every record is tagged source: "mock" so the UI can show a
 * visible "Demo data" badge and nothing is presented as verified fact).
 */
const SAMPLE_DESTINATIONS: Omit<Destination, "id" | "freshness">[] = [
  {
    name: "South Rim Overlook",
    description: "A sweeping canyon-edge viewpoint, best visited near sunset.",
    category: "Nature",
    address: "Canyon Rim Dr",
    latitude: 36.0544,
    longitude: -112.1401,
    phone: null,
    website: null,
    imageUrl: null,
    rating: 4.8,
    price: 35,
    openingHours: "6:00 AM – 8:00 PM",
    reservationRequired: false,
    recommendedDurationMinutes: 150,
    bookingUrl: null,
    bestTimeToVisit: "4:30 PM – Sunset",
    source: "mock",
    lastVerifiedAt: null,
  },
  {
    name: "Old Town History Museum",
    description: "A compact museum covering the region's founding and Indigenous history.",
    category: "Museums",
    address: "100 Main St",
    latitude: 39.7392,
    longitude: -104.9903,
    phone: "+1 555-0100",
    website: null,
    imageUrl: null,
    rating: 4.5,
    price: 12,
    openingHours: "9:00 AM – 5:00 PM",
    reservationRequired: false,
    recommendedDurationMinutes: 90,
    bookingUrl: null,
    bestTimeToVisit: "Morning",
    source: "mock",
    lastVerifiedAt: null,
  },
  {
    name: "Riverside Trailhead",
    description: "An easy-to-moderate hiking trail following the river, popular with families.",
    category: "Hiking",
    address: "Riverside Park",
    latitude: 39.7,
    longitude: -104.95,
    phone: null,
    website: null,
    imageUrl: null,
    rating: 4.6,
    price: 0,
    openingHours: "Sunrise – Sunset",
    reservationRequired: false,
    recommendedDurationMinutes: 120,
    bookingUrl: null,
    bestTimeToVisit: "Morning",
    source: "mock",
    lastVerifiedAt: null,
  },
  {
    name: "Downtown Farm-to-Table Kitchen",
    description: "Locally sourced dinner spot with vegetarian options.",
    category: "Food",
    address: "220 5th Ave",
    latitude: 39.742,
    longitude: -104.99,
    phone: "+1 555-0142",
    website: null,
    imageUrl: null,
    rating: 4.7,
    price: 28,
    openingHours: "11:00 AM – 10:00 PM",
    reservationRequired: true,
    recommendedDurationMinutes: 75,
    bookingUrl: null,
    bestTimeToVisit: "Evening",
    source: "mock",
    lastVerifiedAt: null,
  },
];

function toDestination(id: string, base: Omit<Destination, "id" | "freshness">): Destination {
  return {
    id,
    ...base,
    freshness: { source: "mock", lastVerifiedAt: null, confidence: "unknown" },
  };
}

export class MockPlacesProvider implements PlacesProvider {
  async searchPlaces(request: SearchPlacesRequest): Promise<Destination[]> {
    const query = request.query.toLowerCase();
    const matches = SAMPLE_DESTINATIONS.filter(
      (d) =>
        !query ||
        d.name.toLowerCase().includes(query) ||
        d.category.toLowerCase().includes(query) ||
        d.description.toLowerCase().includes(query),
    );
    const pool = matches.length > 0 ? matches : SAMPLE_DESTINATIONS;
    return pool.map((d, i) => toDestination(`mock-${d.name.toLowerCase().replace(/\s+/g, "-")}-${i}`, d));
  }

  async getPlaceDetails(request: PlaceDetailsRequest): Promise<Destination> {
    const match = SAMPLE_DESTINATIONS.find(
      (d) => `mock-${d.name.toLowerCase().replace(/\s+/g, "-")}` === request.placeId.replace(/-\d+$/, ""),
    );
    const base = match ?? SAMPLE_DESTINATIONS[0]!;
    return toDestination(request.placeId, base);
  }
}
