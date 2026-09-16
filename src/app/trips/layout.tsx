import Link from "next/link";
import Image from "next/image";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { isSupabaseConfigured, getSupabaseServerClient } from "@/lib/db/supabaseServerClient";
import { BRAND } from "@/config/brand";

export default async function TripsLayout({ children }: { children: React.ReactNode }) {
  let userEmail: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={44} height={44} className="rounded-lg" />
          <span className="text-lg font-bold text-brand-blue-700">{BRAND.name}</span>
        </Link>
        <div className="flex items-center gap-4">
          {userEmail ? (
            <>
              <span className="text-sm text-slate-500">{userEmail}</span>
              <LogoutButton />
            </>
          ) : (
            <span className="text-xs text-amber-700">Demo mode — Supabase not configured</span>
          )}
        </div>
      </header>
      {children}
      <AssistantWidget />
    </div>
  );
}
