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
