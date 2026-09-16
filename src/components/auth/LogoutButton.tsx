"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/db/supabaseClient";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await getSupabaseBrowserClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm font-medium text-slate-600 hover:text-brand-blue-600"
    >
      Sign out
    </button>
  );
}
