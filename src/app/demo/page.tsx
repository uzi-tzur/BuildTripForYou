import { Button } from "@/components/ui/Button";

export default function DemoTripPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-brand-blue-700">Demo Trip</h1>
      <p className="max-w-md text-slate-600">
        A sample AI-generated itinerary (PRD Section 24-26) will live here once the Trip
        Planner Agent and Daily Itinerary screen are built.
      </p>
      <Button href="/" variant="secondary">
        Back to Home
      </Button>
    </main>
  );
}
