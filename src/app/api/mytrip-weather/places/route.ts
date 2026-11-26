import { NextResponse } from "next/server";
import type { WeatherPlace, WeatherPlaceSearchResponse } from "@/lib/weatherPlace";

interface OwmGeoResult {
  name: string;
  lat: number;
  lon: number;
  country?: string;
  state?: string;
}

function fail(code: "invalid_request" | "not_configured" | "search_failed", message: string, status: number) {
  const body: WeatherPlaceSearchResponse = { ok: false, error: { code, message } };
  return NextResponse.json(body, { status });
}

/**
 * Finds the places matching a typed city ("Tokyo") so a trip can be given a
 * weather location. Uses OpenWeatherMap's geocoding with the same
 * WEATHER_API_KEY as the forecast, server-side only, behind the /my-trip
 * access-code gate (the "/api/mytrip-weather" prefix in src/middleware.ts).
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) return fail("invalid_request", "Type a city or place name.", 400);

  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) return fail("not_configured", "Weather isn't set up on this server yet.", 503);

  const url = new URL("https://api.openweathermap.org/geo/1.0/direct");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");
  url.searchParams.set("appid", apiKey);

  let results: OwmGeoResult[];
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    results = (await response.json()) as OwmGeoResult[];
  } catch (error) {
    console.error(`weather place search failed: ${error instanceof Error ? error.message : String(error)}`);
    return fail("search_failed", "Couldn't look up that place — try again.", 502);
  }

  const seen = new Set<string>();
  const places: WeatherPlace[] = [];
  for (const r of Array.isArray(results) ? results : []) {
    const name = [r.name, r.state, r.country].filter(Boolean).join(", ");
    if (!r.name || seen.has(name) || !Number.isFinite(r.lat) || !Number.isFinite(r.lon)) continue;
    seen.add(name);
    places.push({ name, latitude: r.lat, longitude: r.lon });
  }

  const body: WeatherPlaceSearchResponse = { ok: true, places };
  return NextResponse.json(body);
}
