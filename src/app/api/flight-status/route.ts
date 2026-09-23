import { NextResponse } from "next/server";
import { getFlightProvider } from "@/lib/providers/flights";

/**
 * Flight status lookup for the no-login trip companion (/my-trip). Called
 * client-side per check, same pattern as /api/mytrip-weather and
 * /api/image-search — it's just the one place AVIATIONSTACK_API_KEY is
 * allowed to be used.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    flightNumber?: string;
    airport?: string | null;
    airline?: string | null;
  };
  const flightNumber = body.flightNumber?.trim();

  if (!flightNumber) {
    return NextResponse.json({ error: "flightNumber is required." }, { status: 400 });
  }

  const usingMockFlightStatus = !process.env.AVIATIONSTACK_API_KEY;

  try {
    const status = await getFlightProvider().getStatus({
      flightNumber,
      airport: body.airport ?? null,
      airline: body.airline ?? null,
    });
    return NextResponse.json({ status, usingMockFlightStatus });
  } catch {
    return NextResponse.json({ status: null, usingMockFlightStatus });
  }
}
