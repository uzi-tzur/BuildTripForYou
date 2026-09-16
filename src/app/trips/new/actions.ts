"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/db/supabaseServerClient";
import { tripService } from "@/lib/services/tripService";
import { preferenceService } from "@/lib/services/preferenceService";
import type { TransportationMode, TravelerType, TripPace } from "@/lib/types";

export async function createTripAction(formData: FormData): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/trips/new");
  }

  const name = String(formData.get("name") ?? "").trim();
  const origin = String(formData.get("origin") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const travelers = Number(formData.get("travelers") ?? 1);
  const travelerAges = String(formData.get("travelerAges") ?? "").trim() || null;
  const transportationMode = String(formData.get("transportationMode") ?? "driving") as TransportationMode;
  const budgetRaw = String(formData.get("budget") ?? "").trim();
  const budget = budgetRaw ? Number(budgetRaw) : null;
  const travelerType = String(formData.get("travelerType") ?? "solo") as TravelerType;
  const pace = String(formData.get("pace") ?? "moderate") as TripPace;
  const budgetLevel = (String(formData.get("budgetLevel") ?? "") || null) as
    | "low"
    | "medium"
    | "high"
    | null;
  const interests = formData.getAll("interests").map(String);

  if (!name || !origin || !destination || !startDate || !endDate) {
    throw new Error("Please fill in all required trip fields.");
  }

  const trip = await tripService.createTrip(supabase, user.id, {
    name,
    startDate,
    endDate,
    origin,
    destination,
    travelers: Number.isFinite(travelers) && travelers > 0 ? travelers : 1,
    transportationMode,
    budget: Number.isFinite(budget as number) ? budget : null,
  });

  await preferenceService.saveForUser(supabase, user.id, {
    travelerType,
    interests,
    budgetLevel,
    pace,
    outdoorIndoorBalance: "balanced",
    foodPreferences: [],
    accommodationPreferences: [],
    travelerAges,
  });

  redirect(`/trips/${trip.id}/building`);
}
