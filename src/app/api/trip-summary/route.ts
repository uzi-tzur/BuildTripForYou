import { NextResponse } from "next/server";
import { writeTripSummary } from "@/lib/ai/agents/tripSummary";
import { summaryRequestSchema, type TripSummaryText } from "@/lib/tripSummary";

export type TripSummaryApiResponse = { ok: true; text: TripSummaryText | null } | { ok: false; error: string };

/**
 * Writes the short Hebrew + English text for a trip's infographic. `text:
 * null` means Claude isn't available right now — the screen then builds the
 * text from the activity names itself. Behind the /my-trip access code
 * (src/middleware.ts), since each call costs money.
 */
export async function POST(request: Request) {
  const parsed = summaryRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const body: TripSummaryApiResponse = { ok: false, error: "Send the trip's days." };
    return NextResponse.json(body, { status: 400 });
  }
  const body: TripSummaryApiResponse = { ok: true, text: await writeTripSummary(parsed.data) };
  return NextResponse.json(body);
}
