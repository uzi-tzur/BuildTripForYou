/**
 * A day's route as one Google Maps directions link, built from the
 * addresses of that day's activities in time order — so opening the day in
 * Google Maps (with its live traffic, opening hours and Ask Maps route tips)
 * takes one tap instead of pasting a link by hand.
 *
 * Uses Google's documented Maps URLs (https://developers.google.com/maps/documentation/urls/get-started#directions-action):
 * no API key, and it opens the Google Maps app on phones.
 */

/** Maps URLs accept up to 9 waypoints between the origin and the destination. */
export const MAX_ROUTE_WAYPOINTS = 9;
export const MAX_ROUTE_STOPS = MAX_ROUTE_WAYPOINTS + 2;

export interface DayRoute {
  url: string;
  /** How many stops the link includes. */
  stopCount: number;
  /** Stops left out because Google Maps takes at most MAX_ROUTE_STOPS. */
  omittedCount: number;
}

/**
 * Where Google Maps should look for a stop: its address, or — when the user
 * only typed a name ("Grandfather Mountain hike") — that name in the day's
 * area (its weather place, e.g. "Boone, North Carolina, US"), so a name-only
 * activity still lands on the map.
 */
export function routeStopQuery(stop: { address?: string | null; name: string }, area: string | null | undefined): string | null {
  const address = stop.address?.trim();
  if (address) return address;
  const name = stop.name.trim();
  if (!name) return null;
  return area?.trim() ? `${name}, ${area.trim()}` : name;
}

/** The route through `addresses` (already in visiting order), or null when there are fewer than two distinct places. */
export function buildDayRoute(addresses: (string | null | undefined)[]): DayRoute | null {
  const places: string[] = [];
  for (const raw of addresses) {
    const address = raw?.trim();
    if (!address) continue;
    // The same place twice in a row (e.g. a hotel's check-in and a stop there) is one stop.
    if (places[places.length - 1]?.toLowerCase() === address.toLowerCase()) continue;
    places.push(address);
  }
  if (places.length < 2) return null;

  const used = places.slice(0, MAX_ROUTE_STOPS);
  const params = new URLSearchParams({ api: "1", origin: used[0]!, destination: used[used.length - 1]! });
  const waypoints = used.slice(1, -1);
  if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));

  return {
    url: `https://www.google.com/maps/dir/?${params.toString()}`,
    stopCount: used.length,
    omittedCount: places.length - used.length,
  };
}
