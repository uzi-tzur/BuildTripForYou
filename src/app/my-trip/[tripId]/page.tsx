import { TripPageClient } from "@/components/mytrip/TripPageClient";

export default async function TripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  return <TripPageClient tripId={tripId} />;
}
