import { NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/supabaseServerClient";
import { planAndPersistTrip } from "@/lib/ai/orchestrator";

export async function POST(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const result = await planAndPersistTrip(supabase, tripId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Trip planning failed", error);
    const message = error instanceof Error ? error.message : "Trip planning failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
