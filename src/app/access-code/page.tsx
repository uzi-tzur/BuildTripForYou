import Image from "next/image";
import { Suspense } from "react";
import { AccessCodeForm } from "@/components/access/AccessCodeForm";
import { BRAND } from "@/config/brand";

export default function AccessCodePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-brand-blue-50/60 via-white to-white px-6 py-16 text-center">
      <Image src="/logo.png" alt="" width={96} height={96} className="rounded-2xl shadow-md" />
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{BRAND.name}</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the 6-digit code to view this trip.</p>
      </div>
      <Suspense>
        <AccessCodeForm />
      </Suspense>
    </main>
  );
}
