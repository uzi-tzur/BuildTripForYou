import { NextResponse } from "next/server";
import { answerAssistantQuery, type AssistantMessage } from "@/lib/ai/agents/assistant";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/supabaseServerClient";
import { tripService } from "@/lib/services/tripService";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    message?: string;
    tripId?: string;
    history?: AssistantMessage[];
  };

  if (!body.message?.trim()) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }

  let trip = null;
  let itinerarySummary: string | null = null;

  if (body.tripId && isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      trip = await tripService.getTrip(supabase, body.tripId);
      const days = await tripService.listTripDays(supabase, body.tripId);
      itinerarySummary = `Trip has ${days.length} day(s) planned.`;
    } catch {
      trip = null;
    }
  }

  try {
    const result = await answerAssistantQuery(
      body.message,
      { trip, itinerarySummary },
      body.history ?? [],
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Assistant query failed", error);
    const message = error instanceof Error ? error.message : "Assistant is unavailable right now.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
