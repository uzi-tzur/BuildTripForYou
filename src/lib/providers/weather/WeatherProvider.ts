import type { WeatherCondition } from "@/lib/types";

export interface ForecastRequest {
  latitude: number;
  longitude: number;
  forecastFor: string;
}

export interface CurrentConditionsRequest {
  latitude: number;
  longitude: number;
}

/** PRD Section 43 — provider abstraction for weather intelligence (Sections 11-15). */
export interface WeatherProvider {
  getForecast(request: ForecastRequest): Promise<WeatherCondition>;
  getCurrentConditions(request: CurrentConditionsRequest): Promise<WeatherCondition>;
}
