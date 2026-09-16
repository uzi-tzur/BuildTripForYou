export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32);
}

/** "2026-09-27" -> "09-27-2026" (US date format). */
export function formatDateUS(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${month}-${day}-${year}`;
}

/**
 * Key for a (date, place) weather lookup — a day can have more than one
 * named place worth checking weather for (e.g. a driving day through
 * several towns). Used to match src/app/api/mytrip-weather/route.ts's
 * response back to the request that asked for it.
 */
export function weatherKey(date: string, name: string): string {
  return `${date}::${name}`;
}
