import { NextResponse } from "next/server";
import { getImageProvider } from "@/lib/providers/images";

/**
 * Trip hero-photo search for the no-login trip companion (/my-trip). Called
 * client-side per search, same pattern as /api/mytrip-weather — it's just
 * the one place PEXELS_API_KEY is allowed to be used.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { query?: string };
  const query = body.query?.trim();

  if (!query) {
    return NextResponse.json({ error: "query is required." }, { status: 400 });
  }

  const usingMockImages = !process.env.PEXELS_API_KEY;

  try {
    const results = await getImageProvider().search(query);
    return NextResponse.json({ results, usingMockImages });
  } catch {
    return NextResponse.json({ results: [], usingMockImages });
  }
}
