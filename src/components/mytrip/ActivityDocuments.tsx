"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  documentOpenUrl,
  formatDocumentSize,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENTS_PER_ACTIVITY,
  type DocumentUploadApiResponse,
  type TripDocument,
} from "@/lib/tripDocuments";

/**
 * "📎 Documents" on an activity: the files attached to it (insurance
 * policy PDF, tickets, confirmations) — each opens in one tap — plus
 * attaching another one. Files are stored privately; opening one goes
 * through the access-code-gated /api/mytrip-documents route.
 */
export function ActivityDocuments({
  documents,
  startOpen,
  onChange,
}: {
  documents: TripDocument[];
  /** Show the "attach" controls right away (the 📎 button was tapped). */
  startOpen: boolean;
  onChange: (documents: TripDocument[]) => void;
}) {
  const [adding, setAdding] = useState(startOpen || documents.length === 0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const full = documents.length >= MAX_DOCUMENTS_PER_ACTIVITY;

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_DOCUMENT_BYTES) {
      setError("That file is larger than 4 MB — try a smaller copy (e.g. a scan at lower quality).");
      return;
    }
    setBusy("Uploading…");
    setError(null);
    try {
      const form = new FormData();
      form.append("document", file, file.name);
      const res = await fetch("/api/mytrip-documents", { method: "POST", body: form });
      const body = (await res.json().catch(() => null)) as DocumentUploadApiResponse | null;
      if (body?.ok) {
        onChange([...documents, body.document]);
        setAdding(false);
      } else setError(body?.error.message ?? "Upload failed — try again.");
    } catch {
      setError("Upload failed — check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(doc: TripDocument) {
    if (!window.confirm(`Remove "${doc.name}"? The file will be deleted and can't be recovered.`)) return;
    setBusy("Removing…");
    setError(null);
    try {
      const res = await fetch(`/api/mytrip-documents?path=${encodeURIComponent(doc.path)}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as DocumentUploadApiResponse | null;
        setError(body && !body.ok ? body.error.message : "The document couldn't be removed — try again.");
        return;
      }
      onChange(documents.filter((d) => d.path !== doc.path));
    } catch {
      setError("The document couldn't be removed — check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-2.5 space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">📎 Documents</p>
      {documents.length > 0 && (
        <ul className="divide-y divide-amber-100">
          {documents.map((doc) => (
            <li key={doc.path} className="flex items-center gap-2 py-1.5">
              <a
                href={documentOpenUrl(doc)}
                target="_blank"
                rel="noreferrer noopener"
                className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-blue-700 underline-offset-2 hover:underline"
                dir="auto"
              >
                {doc.mime === "application/pdf" ? "📄" : "🖼️"} {doc.name}
              </a>
              <span className="shrink-0 text-[11px] text-slate-400">{formatDocumentSize(doc.size)}</span>
              <button
                onClick={() => void remove(doc)}
                disabled={busy !== null}
                aria-label={`Remove ${doc.name}`}
                className="shrink-0 rounded-full px-2 py-0.5 text-lg leading-none text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {busy ? (
        <p className="text-xs font-medium text-slate-500">{busy}</p>
      ) : adding && !full ? (
        <div className="space-y-1.5">
          <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => void handleFile(e)} className="hidden" />
          <button
            onClick={() => inputRef.current?.click()}
            className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-amber-600 active:scale-95"
          >
            Choose a file (PDF or photo, up to 4 MB)
          </button>
          <p className="text-[11px] text-slate-500">Stored privately — opens only from this app, after the access code.</p>
        </div>
      ) : (
        !full && (
          <button onClick={() => setAdding(true)} className="text-xs font-semibold text-amber-700 hover:underline">
            + Attach another
          </button>
        )
      )}
    </div>
  );
}
