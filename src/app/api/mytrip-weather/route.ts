import { NextResponse } from "next/server";
import { weatherKey } from "@/lib/format";
import { weatherService } from "@/lib/services/weatherService";

/**
 * Weather for the no-login trip companion (/my-trip). The trip itself may
 * live only in the browser's localStorage (user-created trips), so this
 * route is called client-side per trip instead of during a server render —
 * it's just the one place WEATHER_API_KEY is allowed to be used.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    locations?: { date: string; name: string; latitude: number; longitude: number }[];
  };

  if (!body.locations || !Array.isArray(body.locations)) {
    return NextResponse.json({ error: "locations is required." }, { status: 400 });
  }

  const usingMockWeather = !process.env.WEATHER_API_KEY;

  const entries = await Promise.all(
    body.locations.map(async (loc) => {
      try {
        const forecast = await weatherService.getForecast(loc.latitude, loc.longitude, `${loc.date}T12:00:00-06:00`);
        return [weatherKey(loc.date, loc.name), forecast] as const;
      } catch {
        return [weatherKey(loc.date, loc.name), null] as const;
      }
    }),
  );

  return NextResponse.json({ weatherByKey: Object.fromEntries(entries), usingMockWeather });
}
