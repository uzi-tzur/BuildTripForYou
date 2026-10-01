/**
 * A trip's time zone, kept on the trip as a fixed UTC offset plus a label
 * (TripMeta.timezoneOffset / timezoneLabel — already synced and backed up).
 * Times the user enters are wall-clock times in this zone. The offset is
 * taken at the trip's start date, so daylight saving time is right for the
 * trip; a trip that spans a DST switch would be an hour off after it.
 */
export interface TripTimeZone {
  id: string; // IANA name, e.g. "America/Chicago"
  label: string; // shown after times, e.g. "Central time"
}

export const TRIP_TIME_ZONES: TripTimeZone[] = [
  { id: "America/New_York", label: "Eastern time" },
  { id: "America/Chicago", label: "Central time" },
  { id: "America/Denver", label: "Mountain time" },
  { id: "America/Phoenix", label: "Arizona time" },
  { id: "America/Los_Angeles", label: "Pacific time" },
  { id: "America/Anchorage", label: "Alaska time" },
  { id: "Pacific/Honolulu", label: "Hawaii time" },
  { id: "Asia/Jerusalem", label: "Israel time" },
  { id: "Europe/London", label: "UK time" },
  { id: "Europe/Paris", label: "Central European time" },
];

/** The zone's UTC offset ("-05:00") on a given date (YYYY-MM-DD), measured at midday so the DST switch hour can't matter. */
export function utcOffsetOn(timeZone: string, date: string): string {
  const instant = new Date(`${date}T12:00:00Z`);
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(instant)
    .find((p) => p.type === "timeZoneName")?.value;
  const match = name?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return "+00:00"; // "GMT" alone means UTC itself
  return `${match[1]}${match[2]!.padStart(2, "0")}:${match[3] ?? "00"}`;
}

/** The trip fields for a chosen zone. */
export function tripTimeZoneFields(zone: TripTimeZone, startDate: string): { timezoneOffset: string; timezoneLabel: string } {
  return { timezoneOffset: utcOffsetOn(zone.id, startDate), timezoneLabel: zone.label };
}

/** The device's own zone, for a new trip: a listed one if it matches, else named after its city ("Toronto time"). */
export function deviceTripTimeZone(): TripTimeZone {
  let id = "America/Denver";
  try {
    id = Intl.DateTimeFormat().resolvedOptions().timeZone || id;
  } catch {
    // Keep the default.
  }
  const listed = TRIP_TIME_ZONES.find((z) => z.id === id);
  if (listed) return listed;
  const city = id.split("/").pop()?.replace(/_/g, " ") ?? "Local";
  return { id, label: `${city} time` };
}
