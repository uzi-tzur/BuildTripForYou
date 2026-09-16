import { TripListClient } from "@/components/mytrip/TripListClient";
import { BRAND } from "@/config/brand";

export const metadata = {
  title: `My Trips — ${BRAND.name}`,
};

export default function MyTripsPage() {
  return <TripListClient />;
}
