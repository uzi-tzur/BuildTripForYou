import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxies a Google Places photo so GOOGLE_MAPS_API_KEY never reaches the
 * browser. `name` is the `photos[].name` resource path Google returns
 * from Places API searches (e.g. "places/XYZ/photos/ABC").
 */
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!name || !apiKey) {
    return NextResponse.json({ error: "Photo unavailable" }, { status: 404 });
  }

  const upstream = await fetch(
    `https://places.googleapis.com/v1/${name}/media?maxWidthPx=800&key=${apiKey}`,
  );

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Photo unavailable" }, { status: upstream.status });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
