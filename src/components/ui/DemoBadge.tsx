/**
 * Marks any value that came from a mock provider instead of a real,
 * verified source (PRD Rule 5 — never present fabricated data as fact).
 */
export function DemoBadge({ label = "Demo data" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
      <span aria-hidden>●</span>
      {label}
    </span>
  );
}
