import type { WeatherCondition } from "@/lib/types";
import type {
  CurrentConditionsRequest,
  ForecastRequest,
  WeatherProvider,
} from "./WeatherProvider";

const CONDITIONS = ["Clear", "Partly Cloudy", "Cloudy", "Light Rain", "Thunderstorms"] as const;

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  return hash;
}

/**
 * Deterministic demo weather used when WEATHER_API_KEY isn't set. Values
 * are stable per (location, time) so the UI is consistent across
 * reloads, but they are NOT a real forecast (PRD Rule 5) — always shown
 * with a "Demo data" badge.
 */
export class MockWeatherProvider implements WeatherProvider {
  async getForecast(request: ForecastRequest): Promise<WeatherCondition> {
    return this.build(request.latitude, request.longitude, request.forecastFor);
  }

  async getCurrentConditions(request: CurrentConditionsRequest): Promise<WeatherCondition> {
    return this.build(request.latitude, request.longitude, new Date().toISOString());
  }

  private build(latitude: number, longitude: number, forecastFor: string): WeatherCondition {
    const seed = hashString(`${latitude.toFixed(2)},${longitude.toFixed(2)},${forecastFor.slice(0, 13)}`);
    const condition = CONDITIONS[seed % CONDITIONS.length]!;
    const precipitationChance = condition === "Thunderstorms" ? 70 + (seed % 20) : condition === "Light Rain" ? 40 + (seed % 20) : seed % 15;

    const temperatureC = 15 + (seed % 20);
    return {
      id: `mock-weather-${seed}`,
      location: `${latitude.toFixed(2)},${longitude.toFixed(2)}`,
      latitude,
      longitude,
      observedAt: new Date().toISOString(),
      forecastFor,
      temperatureC,
      temperatureMinC: temperatureC - 4 - (seed % 3),
      temperatureMaxC: temperatureC + 3 + (seed % 4),
      conditionSummary: condition,
      precipitationChance,
      windSpeedKph: 5 + (seed % 25),
      provider: "mock",
    };
  }
}
