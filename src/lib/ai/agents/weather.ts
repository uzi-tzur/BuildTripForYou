import { weatherService } from "@/lib/services/weatherService";
import type { Activity, Destination, WeatherAlert } from "@/lib/types";

const OUTDOOR_CATEGORY_HINTS = ["nature", "hiking", "beach", "adventure", "photography", "park", "trail", "outdoor"];

function isLikelyOutdoor(category: string): boolean {
  const lower = category.toLowerCase();
  return OUTDOOR_CATEGORY_HINTS.some((hint) => lower.includes(hint));
}

export interface WeatherFlag {
  activityId: string;
  severity: WeatherAlert["severity"];
  message: string;
  recommendedAction: string;
}

/**
 * Weather Agent (PRD Section 19, Section 12 "Weather-Aware Planning").
 * Flags outdoor activities whose forecast shows meaningful rain/storm
 * risk. Returns in-memory flags only (Rule 6) — Trip Guardian (Phase 9)
 * decides which ones become persisted WeatherAlert recommendations.
 */
export async function analyzeActivityWeather(
  activities: Array<Activity & { destination?: Destination }>,
): Promise<WeatherFlag[]> {
  const flags: WeatherFlag[] = [];

  for (const activity of activities) {
    if (activity.activityType !== "attraction" || !activity.destination) continue;
    if (!isLikelyOutdoor(activity.destination.category)) continue;

    const forecast = await weatherService.getForecast(
      activity.destination.latitude,
      activity.destination.longitude,
      activity.startTime,
    );

    const precipitation = forecast.precipitationChance ?? 0;
    if (precipitation < 40) continue;

    const severity: WeatherAlert["severity"] = precipitation >= 70 ? "high" : "moderate";
    flags.push({
      activityId: activity.id,
      severity,
      message: `${precipitation}% chance of ${forecast.conditionSummary.toLowerCase()} during your ${activity.destination.name} visit.`,
      recommendedAction: "Consider moving this activity earlier/later or choosing an indoor alternative.",
    });
  }

  return flags;
}
