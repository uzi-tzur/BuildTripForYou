import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { BRAND } from "@/config/brand";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-b from-brand-blue-50 via-white to-brand-green-50 px-6 py-16 text-center">
      <Image src="/logo.png" alt={`${BRAND.name} logo`} width={220} height={220} priority className="rounded-2xl" />

      <div className="space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight text-brand-blue-700 sm:text-5xl">
          {BRAND.name}
        </h1>
        <p className="text-lg font-medium text-brand-green-700">{BRAND.subtitle}</p>
        <p className="text-base text-slate-600">{BRAND.tagline}</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Button href="/trips/new" variant="primary">
          Create My Trip
        </Button>
        <Button href="/demo" variant="secondary">
          Explore Demo Trip
        </Button>
      </div>
    </main>
  );
}
