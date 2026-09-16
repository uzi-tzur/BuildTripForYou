/** PRD Section 11-15 — Weather Intelligence and Section 40 "Weather Alert Entity". */
export interface WeatherCondition {
  id: string;
  location: string;
  latitude: number;
  longitude: number;
  observedAt: string;
  forecastFor: string | null;
  temperatureC: number | null;
  /** The day's forecast low/high, not just the temperature at forecastFor. */
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  conditionSummary: string;
  precipitationChance: number | null;
  windSpeedKph: number | null;
  provider: string;
}

export type WeatherAlertSeverity = "low" | "moderate" | "high" | "severe";
export type WeatherAlertStatus = "open" | "acknowledged" | "resolved" | "dismissed";

export interface WeatherAlert {
  id: string;
  tripId: string;
  activityId: string | null;
  alertType: string;
  severity: WeatherAlertSeverity;
  message: string;
  detectedAt: string;
  recommendedAction: string | null;
  status: WeatherAlertStatus;
}
