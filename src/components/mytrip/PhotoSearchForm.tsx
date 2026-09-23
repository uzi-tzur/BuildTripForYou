"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { DemoBadge } from "@/components/ui/DemoBadge";
import type { ImageSearchResult } from "@/lib/providers/images";

export function PhotoSearchForm({
  heading = "Search a photo for the background",
  initialQuery,
  onSave,
  onCancel,
}: {
  heading?: string;
  initialQuery: string;
  onSave: (url: string, caption: string) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ImageSearchResult[] | null>(null);
  const [usingMock, setUsingMock] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearching(true);
    setError(null);
    try {
      const res = await fetch("/api/image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const body = (await res.json()) as { results?: ImageSearchResult[]; usingMockImages?: boolean };
      const found = body.results ?? [];
      setResults(found);
      setUsingMock(Boolean(body.usingMockImages));
      if (found.length === 0) setError("No photos found — try a different search.");
    } catch {
      setError("Search failed — try again.");
    } finally {
      setSearching(false);
    }
  }

  function choose(result: ImageSearchResult) {
    const caption = result.provider === "pexels" ? `Photo by ${result.photographer} on Pexels` : null;
    onSave(result.url, caption ?? "");
  }

  return (
    <div className="mt-3 space-y-2.5 rounded-xl border border-dashed border-violet-300 bg-violet-50/50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{heading}</p>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Great Smoky Mountains"
          autoFocus
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm transition-colors focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
        <button
          type="submit"
          disabled={searching}
          className="shrink-0 rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-violet-600 active:scale-95 disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {usingMock && results && results.length > 0 && (
        <div className="flex items-center gap-1.5">
          <DemoBadge label="Demo photos" />
          <span className="text-xs text-slate-500">Add PEXELS_API_KEY on the server for real search results.</span>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {results.map((r) => (
            <button
              key={r.url}
              type="button"
              onClick={() => choose(r)}
              aria-label={`Use this photo (${r.photographer})`}
              className="group relative aspect-video overflow-hidden rounded-lg ring-1 ring-black/5 transition-all hover:ring-2 hover:ring-brand-blue-400"
            >
              <Image src={r.thumbUrl} alt="" fill sizes="120px" className="object-cover transition-transform group-hover:scale-105" />
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
      >
        Cancel
      </button>
    </div>
  );
}
