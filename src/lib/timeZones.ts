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
  { id: "Europe/Athens", label: "Eastern European time" },
  { id: "Europe/Istanbul", label: "Turkey time" },
  { id: "Asia/Dubai", label: "UAE time" },
  { id: "Asia/Kolkata", label: "India time" },
  { id: "Asia/Bangkok", label: "Thailand time" },
  { id: "Asia/Singapore", label: "Singapore time" },
  { id: "Asia/Hong_Kong", label: "Hong Kong time" },
  { id: "Asia/Shanghai", label: "China time" },
  { id: "Asia/Seoul", label: "Korea time" },
  { id: "Asia/Tokyo", label: "Japan time" },
  { id: "Australia/Sydney", label: "Sydney time" },
  { id: "Pacific/Auckland", label: "New Zealand time" },
  { id: "America/Mexico_City", label: "Mexico City time" },
  { id: "America/Sao_Paulo", label: "Brazil time" },
];

/**
 * Countries in a single time zone, by ISO code — so a trip's weather place
 * ("Tokyo, JP") tells us its time zone. Countries spanning several zones
 * (US, Canada, Australia, Brazil, …) are left out on purpose: the place's
 * country alone can't say which one.
 */
const SINGLE_ZONE_COUNTRIES: Record<string, string> = {
  JP: "Asia/Tokyo",
  KR: "Asia/Seoul",
  CN: "Asia/Shanghai",
  HK: "Asia/Hong_Kong",
  TW: "Asia/Shanghai",
  SG: "Asia/Singapore",
  TH: "Asia/Bangkok",
  VN: "Asia/Bangkok",
  IN: "Asia/Kolkata",
  AE: "Asia/Dubai",
  IL: "Asia/Jerusalem",
  TR: "Europe/Istanbul",
  GR: "Europe/Athens",
  CY: "Europe/Athens",
  GB: "Europe/London",
  IE: "Europe/London",
  FR: "Europe/Paris",
  DE: "Europe/Paris",
  IT: "Europe/Paris",
  ES: "Europe/Paris",
  NL: "Europe/Paris",
  BE: "Europe/Paris",
  CH: "Europe/Paris",
  AT: "Europe/Paris",
  CZ: "Europe/Paris",
  HU: "Europe/Paris",
  PL: "Europe/Paris",
  HR: "Europe/Paris",
  DK: "Europe/Paris",
  NO: "Europe/Paris",
  SE: "Europe/Paris",
  NZ: "Pacific/Auckland",
};

/** The time zone of a weather place named like "Kyoto, JP", when its country has only one. */
export function placeTimeZone(placeName: string): TripTimeZone | null {
  const country = placeName.split(",").pop()?.trim() ?? "";
  if (!/^[A-Z]{2}$/.test(country)) return null;
  const id = SINGLE_ZONE_COUNTRIES[country];
  return id ? (TRIP_TIME_ZONES.find((z) => z.id === id) ?? null) : null;
}

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
