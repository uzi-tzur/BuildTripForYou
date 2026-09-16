import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { BRAND } from "@/config/brand";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold text-brand-blue-700">Sign in to {BRAND.name}</h1>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
      <p className="text-sm text-slate-600">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-brand-blue-600 underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
