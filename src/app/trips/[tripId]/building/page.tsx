import { TripBuilder } from "@/components/trips/TripBuilder";

export default async function TripBuildingPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  return <TripBuilder tripId={tripId} />;
}
