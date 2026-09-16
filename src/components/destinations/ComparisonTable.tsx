import type { Destination } from "@/lib/types";

/** PRD Section 10 — Destination Comparison. */
export function ComparisonTable({ destinations }: { destinations: Destination[] }) {
  if (destinations.length === 0) return null;

  const rows: { label: string; render: (d: Destination) => React.ReactNode }[] = [
    { label: "Rating", render: (d) => (d.rating !== null ? `⭐ ${d.rating.toFixed(1)}` : "—") },
    { label: "Price", render: (d) => (d.price === null ? "—" : d.price === 0 ? "Free" : `$${d.price}`) },
    {
      label: "Visit duration",
      render: (d) =>
        d.recommendedDurationMinutes !== null ? `${Math.round(d.recommendedDurationMinutes / 60)}h` : "—",
    },
    { label: "Reservation", render: (d) => (d.reservationRequired ? "Required" : "Not required") },
    { label: "Category", render: (d) => d.category },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-2 font-medium text-slate-500">Attribute</th>
            {destinations.map((d) => (
              <th key={d.id} className="px-4 py-2 font-semibold text-slate-800">
                {d.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-slate-100">
              <td className="px-4 py-2 text-slate-500">{row.label}</td>
              {destinations.map((d) => (
                <td key={d.id} className="px-4 py-2 text-slate-700">
                  {row.render(d)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
