import type { ReactNode } from "react";

/** Shown wherever a feature depends on an env var the user hasn't set yet. */
export function ConfigWarning({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {children}
    </div>
  );
}
