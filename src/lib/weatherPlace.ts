/**
 * The place a trip's weather is shown for, e.g. "Tokyo, JP". Trips built
 * from "+ Add activity" have no hand-entered weather stops (unlike the
 * built-in Colorado itinerary), so without this the app never asked for a
 * forecast at all.
 */
export interface WeatherPlace {
  name: string;
  latitude: number;
  longitude: number;
}

export type WeatherPlaceSearchResponse =
  | { ok: true; places: WeatherPlace[] }
  | { ok: false; error: { code: "invalid_request" | "not_configured" | "search_failed"; message: string } };

/** Accepts only a well-formed place — used on anything read back from storage or the cloud. */
export function toWeatherPlace(value: unknown): WeatherPlace | null {
  if (!value || typeof value !== "object") return null;
  const { name, latitude, longitude } = value as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim()) return null;
  if (typeof latitude !== "number" || !Number.isFinite(latitude) || Math.abs(latitude) > 90) return null;
  if (typeof longitude !== "number" || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  return { name: name.trim(), latitude, longitude };
}

/** OpenWeatherMap's free forecast covers about 5 days ahead; outside that there's no real forecast to show. */
export const FORECAST_DAYS_AHEAD = 5;

/** True when `date` (YYYY-MM-DD) is between yesterday and FORECAST_DAYS_AHEAD days from `today`. */
export function isWithinForecastWindow(date: string, today: Date = new Date()): boolean {
  const day = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(day)) return false;
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const diffDays = Math.round((day - todayUtc) / 86_400_000);
  return diffDays >= -1 && diffDays <= FORECAST_DAYS_AHEAD;
}

/** Per-day weather places for a trip that moves (e.g. a round trip), keyed by day number "1", "2", … — so they stay with their day if the trip's dates move. */
export type DayWeatherPlaces = Record<string, WeatherPlace>;

/**
 * What's stored in the cloud's weather_location column. A plain place is
 * the original format (trip-wide only); `{ trip, days }` adds per-day places.
 */
export function encodeTripWeather(trip: WeatherPlace | null | undefined, days: DayWeatherPlaces | undefined): unknown {
  const hasDays = days && Object.keys(days).length > 0;
  if (!hasDays) return trip ?? null;
  return { trip: trip ?? null, days };
}

export function decodeTripWeather(value: unknown): { weatherLocation: WeatherPlace | null; dayWeatherLocations: DayWeatherPlaces } {
  const direct = toWeatherPlace(value);
  if (direct) return { weatherLocation: direct, dayWeatherLocations: {} };
  if (!value || typeof value !== "object") return { weatherLocation: null, dayWeatherLocations: {} };
  const { trip, days } = value as { trip?: unknown; days?: unknown };
  return { weatherLocation: toWeatherPlace(trip), dayWeatherLocations: toDayWeatherPlaces(days) };
}

export function toDayWeatherPlaces(value: unknown): DayWeatherPlaces {
  const result: DayWeatherPlaces = {};
  if (!value || typeof value !== "object") return result;
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const place = toWeatherPlace(raw);
    if (/^\d{1,3}$/.test(key) && place) result[key] = place;
  }
  return result;
}
