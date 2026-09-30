export type DriveTimeErrorCode = "invalid_request" | "not_configured" | "unavailable";

export type DriveTimeApiResponse =
  | { ok: true; durationSeconds: number; distanceMeters: number }
  | { ok: false; error: { code: DriveTimeErrorCode; message: string } };

/** "21 min", "1 hr", "1 hr 20 min" — never less than 1 min. */
export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/** "5.0 mi" under 10 miles, whole miles above. */
export function formatMiles(meters: number): string {
  const miles = meters / 1609.344;
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
}
