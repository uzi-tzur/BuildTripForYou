import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { BRAND } from "@/config/brand";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold text-brand-blue-700">Create your {BRAND.name} account</h1>
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
      <p className="text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-blue-600 underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
