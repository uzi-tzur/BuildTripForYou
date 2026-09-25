import { celsiusToFahrenheit } from "@/lib/format";
import type { WeatherCondition } from "@/lib/types";

/** How high a chance has to be before a time window counts as "likely to rain". */
const RAIN_LIKELY_THRESHOLD = 30;

function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", timeZone: "America/Denver" });
}

/**
 * Picks out the forecast intervals with a meaningful rain chance and
 * describes them as a time range, e.g. "2–5 PM" — or "2 PM" if only one
 * interval clears the threshold. Returns null when nothing in the day is
 * likely enough to call out.
 */
export function rainWindowLabel(windows: { time: string; chance: number }[] | null): string | null {
  if (!windows) return null;
  const likely = windows.filter((w) => w.chance >= RAIN_LIKELY_THRESHOLD).sort((a, b) => a.time.localeCompare(b.time));
  if (likely.length === 0) return null;
  const start = formatHour(likely[0]!.time);
  const end = formatHour(likely[likely.length - 1]!.time);
  return start === end ? start : `${start}–${end}`;
}

/** "47°–71°F · Precipitation 20% · ☔ Rain likely 2–5 PM" — one place's day forecast as a single line. */
export function weatherSummary(weather: WeatherCondition): string {
  const low = celsiusToFahrenheit(weather.temperatureMinC ?? weather.temperatureC ?? 0);
  const high = celsiusToFahrenheit(weather.temperatureMaxC ?? weather.temperatureC ?? 0);
  const parts = [low === high ? `${high}°F` : `${low}°–${high}°F`];
  if (weather.precipitationChance != null) parts.push(`Precipitation ${weather.precipitationChance}%`);
  const rain = rainWindowLabel(weather.precipitationWindows);
  if (rain) parts.push(`☔ Rain likely ${rain}`);
  return parts.join(" · ");
}
