/**
 * Documents attached to an activity — an insurance policy PDF, tickets, a
 * booking confirmation. The file lives in the PRIVATE trip-documents
 * bucket (supabase/migrations/0014_trip_documents_bucket.sql); the activity
 * keeps only this small record, which syncs and backs up with the rest of
 * the trip. A file is opened through /api/mytrip-documents, never a public URL.
 */
export const TRIP_DOCUMENTS_BUCKET = "trip-documents";

/** Under Vercel's 4.5 MB request limit (the file passes through the server). */
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
export const MAX_DOCUMENTS_PER_ACTIVITY = 10;
export const MAX_DOCUMENT_NAME = 120;

export interface TripDocument {
  /** Storage path in the bucket, e.g. "3f2c…e1.pdf" — random, so it can't be guessed. */
  path: string;
  /** The file's own name, shown in the list. */
  name: string;
  size: number;
  mime: DocumentMime;
  uploadedAt: string;
}

export type DocumentMime = "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

export type DocumentErrorCode = "invalid_request" | "too_large" | "unsupported_type" | "not_configured" | "storage_unavailable" | "upload_failed" | "not_found";

export type DocumentUploadApiResponse =
  | { ok: true; document: TripDocument }
  | { ok: false; error: { code: DocumentErrorCode; message: string } };

/** A random UUID plus one of our extensions — anything else isn't a path this app created. */
const PATH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$/;

export function isDocumentPath(value: unknown): value is string {
  return typeof value === "string" && PATH.test(value);
}

/** Identifies the file by its first bytes rather than trusting the declared type. */
export function detectDocumentType(bytes: Uint8Array): { mime: DocumentMime; ext: string } | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes.length >= 5 && ascii(0, 5) === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mime: "image/png", ext: "png" };
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

/** A file name safe to show and to send as a download name: no path, no control characters. */
export function cleanDocumentName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f"]/g, "").trim().slice(0, MAX_DOCUMENT_NAME);
  return cleaned || "Document";
}

const MIMES: readonly DocumentMime[] = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

/** Rebuilds an activity's document list from untrusted data (cloud row, backup file), dropping anything malformed. */
export function sanitizeDocuments(value: unknown): TripDocument[] {
  if (!Array.isArray(value)) return [];
  const docs: TripDocument[] = [];
  for (const raw of value.slice(0, MAX_DOCUMENTS_PER_ACTIVITY)) {
    if (!raw || typeof raw !== "object") continue;
    const { path, name, size, mime, uploadedAt } = raw as Record<string, unknown>;
    if (!isDocumentPath(path) || docs.some((d) => d.path === path)) continue;
    if (typeof name !== "string" || !MIMES.includes(mime as DocumentMime)) continue;
    docs.push({
      path,
      name: cleanDocumentName(name),
      size: typeof size === "number" && Number.isFinite(size) && size >= 0 ? size : 0,
      mime: mime as DocumentMime,
      uploadedAt: typeof uploadedAt === "string" && uploadedAt.length <= 40 ? uploadedAt : "",
    });
  }
  return docs;
}

/** Where the app opens a document: the gated route, which redirects to a short-lived private link. */
export function documentOpenUrl(doc: TripDocument): string {
  return `/api/mytrip-documents?path=${encodeURIComponent(doc.path)}&name=${encodeURIComponent(doc.name)}`;
}

export function formatDocumentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
