import { NextResponse } from "next/server";
import type { DriveTimeApiResponse, DriveTimeErrorCode } from "@/lib/driveTime";
import { GoogleMapsRoutingProvider } from "@/lib/providers/routing/googleMaps";

const MAX_ADDRESS_LENGTH = 300;

function fail(code: DriveTimeErrorCode, message: string, status: number) {
  const body: DriveTimeApiResponse = { ok: false, error: { code, message } };
  return NextResponse.json(body, { status });
}

function address(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= MAX_ADDRESS_LENGTH ? trimmed : null;
}

/**
 * Driving time between two stops for the no-login trip companion's "Right
 * now" card — the one place GOOGLE_MAPS_API_KEY is used for it, behind the
 * /my-trip access-code gate (src/middleware.ts). Deliberately no mock
 * fallback: the mock routing provider's numbers aren't real distances, and
 * a made-up drive time could make someone late, so with no key this
 * reports the feature as not set up and the card shows nothing.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { origin?: unknown; destination?: unknown };
  const origin = address(body.origin);
  const destination = address(body.destination);
  if (!origin || !destination) return fail("invalid_request", "origin and destination addresses are required.", 400);

  if (!process.env.GOOGLE_MAPS_API_KEY) return fail("not_configured", "Drive times aren't set up on this server.", 503);

  try {
    const route = await new GoogleMapsRoutingProvider().calculateRoute({ origin, destination, travelMode: "driving" });
    const payload: DriveTimeApiResponse = {
      ok: true,
      durationSeconds: route.trafficDurationSeconds ?? route.estimatedDurationSeconds,
      distanceMeters: route.distanceMeters,
    };
    return NextResponse.json(payload);
  } catch (error) {
    // Google's reason (API not enabled, key restricted, billing…) goes to the server logs, not to the page.
    console.error("drive-time: Google Routes request failed:", error instanceof Error ? error.message : error);
    return fail("unavailable", "Couldn't get a drive time right now.", 502);
  }
}
