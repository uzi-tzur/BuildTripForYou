import type { WeatherCondition } from "@/lib/types";
import type {
  CurrentConditionsRequest,
  ForecastRequest,
  WeatherProvider,
} from "./WeatherProvider";

interface OwmWeatherEntry {
  dt: number;
  main: { temp: number; temp_min: number; temp_max: number };
  weather: Array<{ main: string; description: string }>;
  pop?: number; // probability of precipitation, 0-1
  wind: { speed: number };
}

interface OwmForecastResponse {
  list: OwmWeatherEntry[];
}

interface OwmCurrentResponse extends OwmWeatherEntry {
  dt: number;
}

/**
 * OpenWeatherMap adapter (free "5 day / 3 hour forecast" + "current
 * weather" endpoints) — PRD Sections 11-15. Requires WEATHER_API_KEY.
 */
export class OpenWeatherMapProvider implements WeatherProvider {
  private get apiKey(): string {
    const key = process.env.WEATHER_API_KEY;
    if (!key) throw new Error("WEATHER_API_KEY is not set.");
    return key;
  }

  async getForecast(request: ForecastRequest): Promise<WeatherCondition> {
    const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
    url.searchParams.set("lat", String(request.latitude));
    url.searchParams.set("lon", String(request.longitude));
    url.searchParams.set("units", "metric");
    url.searchParams.set("appid", this.apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenWeatherMap forecast failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as OwmForecastResponse;
    const targetTime = new Date(request.forecastFor).getTime();
    const closest = data.list.reduce((best, entry) =>
      Math.abs(entry.dt * 1000 - targetTime) < Math.abs(best.dt * 1000 - targetTime) ? entry : best,
    );

    // The free forecast endpoint has no single "today's high/low" field —
    // each 3-hour entry only carries its own min/max for that slot. Build
    // a real day-level range by looking at every entry that falls on the
    // same local calendar date as the target, not just the closest one.
    const { date: targetDate, offsetMinutes } = extractDateAndOffset(request.forecastFor);
    const sameDayEntries = data.list.filter((entry) => localDateString(entry.dt, offsetMinutes) === targetDate);
    const dayEntries = sameDayEntries.length > 0 ? sameDayEntries : [closest];
    const temperatureMinC = Math.min(...dayEntries.map((e) => e.main.temp_min ?? e.main.temp));
    const temperatureMaxC = Math.max(...dayEntries.map((e) => e.main.temp_max ?? e.main.temp));

    return toWeatherCondition(closest, request.latitude, request.longitude, request.forecastFor, temperatureMinC, temperatureMaxC);
  }

  async getCurrentConditions(request: CurrentConditionsRequest): Promise<WeatherCondition> {
    const url = new URL("https://api.openweathermap.org/data/2.5/weather");
    url.searchParams.set("lat", String(request.latitude));
    url.searchParams.set("lon", String(request.longitude));
    url.searchParams.set("units", "metric");
    url.searchParams.set("appid", this.apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenWeatherMap current weather failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as OwmCurrentResponse;
    return toWeatherCondition(
      data,
      request.latitude,
      request.longitude,
      new Date().toISOString(),
      data.main.temp_min ?? data.main.temp,
      data.main.temp_max ?? data.main.temp,
    );
  }
}

/** Splits "2026-09-28T12:00:00-06:00" into its date and UTC-offset minutes. */
function extractDateAndOffset(isoWithOffset: string): { date: string; offsetMinutes: number } {
  const date = isoWithOffset.slice(0, 10);
  const match = isoWithOffset.match(/([+-])(\d{2}):(\d{2})$/);
  const offsetMinutes = match ? (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) : 0;
  return { date, offsetMinutes };
}

/** The calendar date (YYYY-MM-DD) a UTC unix timestamp falls on at a given UTC-offset. */
function localDateString(unixSeconds: number, offsetMinutes: number): string {
  return new Date(unixSeconds * 1000 + offsetMinutes * 60_000).toISOString().slice(0, 10);
}

function toWeatherCondition(
  entry: OwmWeatherEntry,
  latitude: number,
  longitude: number,
  forecastFor: string,
  temperatureMinC: number,
  temperatureMaxC: number,
): WeatherCondition {
  return {
    id: `owm-${entry.dt}-${latitude}-${longitude}`,
    location: `${latitude.toFixed(2)},${longitude.toFixed(2)}`,
    latitude,
    longitude,
    observedAt: new Date().toISOString(),
    forecastFor,
    temperatureC: entry.main.temp,
    temperatureMinC,
    temperatureMaxC,
    conditionSummary: entry.weather[0]?.description ?? entry.weather[0]?.main ?? "Unknown",
    precipitationChance: entry.pop !== undefined ? Math.round(entry.pop * 100) : null,
    windSpeedKph: Math.round(entry.wind.speed * 3.6),
    provider: "openweathermap",
  };
}
