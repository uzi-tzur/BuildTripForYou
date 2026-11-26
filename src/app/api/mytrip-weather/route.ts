import { NextResponse } from "next/server";
import { weatherKey } from "@/lib/format";
import { weatherService } from "@/lib/services/weatherService";
import { isWithinForecastWindow } from "@/lib/weatherPlace";

/**
 * Weather for the no-login trip companion (/my-trip). The trip itself may
 * live only in the browser's localStorage (user-created trips), so this
 * route is called client-side per trip instead of during a server render —
 * it's just the one place WEATHER_API_KEY is allowed to be used.
 *
 * Days outside the ~5-day forecast window get null rather than the nearest
 * forecast, which would show another day's weather as if it were theirs.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    locations?: { date: string; name: string; latitude: number; longitude: number }[];
    /** The trip's UTC offset, e.g. "+09:00" — which calendar day each forecast belongs to. */
    timezoneOffset?: string;
  };

  if (!body.locations || !Array.isArray(body.locations)) {
    return NextResponse.json({ error: "locations is required." }, { status: 400 });
  }

  const offset = typeof body.timezoneOffset === "string" && /^[+-]\d{2}:\d{2}$/.test(body.timezoneOffset) ? body.timezoneOffset : "-06:00";
  const usingMockWeather = !process.env.WEATHER_API_KEY;

  const entries = await Promise.all(
    body.locations.map(async (loc) => {
      const key = weatherKey(loc.date, loc.name);
      if (!usingMockWeather && !isWithinForecastWindow(loc.date)) return [key, null] as const;
      try {
        const forecast = await weatherService.getForecast(loc.latitude, loc.longitude, `${loc.date}T12:00:00${offset}`);
        return [key, forecast] as const;
      } catch {
        return [key, null] as const;
      }
    }),
  );

  return NextResponse.json({ weatherByKey: Object.fromEntries(entries), usingMockWeather });
}
