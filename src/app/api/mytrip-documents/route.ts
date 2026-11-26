import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  cleanDocumentName,
  detectDocumentType,
  isDocumentPath,
  MAX_DOCUMENT_BYTES,
  TRIP_DOCUMENTS_BUCKET,
  type DocumentErrorCode,
  type DocumentUploadApiResponse,
} from "@/lib/tripDocuments";

/** How long an "open document" link works. Opening it again from the app makes a new one. */
const LINK_SECONDS = 300;

function fail(code: DocumentErrorCode, message: string, status: number) {
  const body: DocumentUploadApiResponse = { ok: false, error: { code, message } };
  return NextResponse.json(body, { status });
}

/** A pasted key often picks up spaces, a line break or quotes. */
function cleanKey(raw: string | undefined): string | undefined {
  return raw?.trim().replace(/^["']|["']$/g, "").trim() || undefined;
}

function storage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }).storage.from(TRIP_DOCUMENTS_BUCKET);
}

/** Storage couldn't be reached or its database is down — as opposed to refusing this request. */
function isUnavailable(error: { message: string; status?: unknown; statusCode?: unknown }): boolean {
  const status = Number(error.status ?? error.statusCode);
  return status >= 500 || /fetch failed|timed out|timeout|ECONNREFUSED|ENOTFOUND/i.test(error.message);
}

/**
 * Documents attached to an activity (insurance PDF, tickets…), kept in the
 * PRIVATE trip-documents bucket. Every method sits behind the /my-trip
 * access-code gate (src/middleware.ts) and uses the service-role key
 * server-side only — the bucket has no public URLs and no anon access.
 *
 * POST   form-data "document"  → stores it, returns its record
 * GET    ?path=…&name=…        → redirects to a link that expires in 5 minutes
 * DELETE ?path=…               → removes the file
 */
export async function POST(request: Request) {
  const bucket = storage();
  if (!bucket) return fail("not_configured", "Document uploads aren't set up on this server yet.", 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("invalid_request", "Send the document as form data.", 400);
  }
  const file = form.get("document");
  if (!(file instanceof File) || file.size === 0) return fail("invalid_request", "No document was sent.", 400);
  if (file.size > MAX_DOCUMENT_BYTES) return fail("too_large", "That file is larger than 4 MB.", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectDocumentType(bytes);
  if (!type) return fail("unsupported_type", "Only PDF, JPEG, PNG or WebP files can be attached.", 415);

  const path = `${crypto.randomUUID()}.${type.ext}`;
  const { error } = await bucket.upload(path, bytes, { contentType: type.mime, upsert: false });
  if (error) {
    console.error(`mytrip-documents: upload failed: ${error.message}`);
    if (isUnavailable(error)) return fail("storage_unavailable", "Document storage is offline right now — try again later.", 503);
    return fail("upload_failed", "The document couldn't be saved — try again.", 502);
  }

  const body: DocumentUploadApiResponse = {
    ok: true,
    document: { path, name: cleanDocumentName(file.name), size: file.size, mime: type.mime, uploadedAt: new Date().toISOString() },
  };
  return NextResponse.json(body);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const path = params.get("path");
  if (!isDocumentPath(path)) return fail("invalid_request", "That isn't a document of this trip.", 400);
  const bucket = storage();
  if (!bucket) return fail("not_configured", "Documents aren't set up on this server yet.", 503);

  // PDFs and images open in the browser; the name is used if the user saves it.
  const name = cleanDocumentName(params.get("name") ?? "");
  const { data, error } = await bucket.createSignedUrl(path, LINK_SECONDS, { download: false });
  if (error || !data?.signedUrl) {
    if (error && isUnavailable(error)) return fail("storage_unavailable", "Document storage is offline right now — try again later.", 503);
    return fail("not_found", `"${name}" couldn't be found — it may have been removed.`, 404);
  }
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const path = new URL(request.url).searchParams.get("path");
  if (!isDocumentPath(path)) return fail("invalid_request", "That isn't a document of this trip.", 400);
  const bucket = storage();
  if (!bucket) return fail("not_configured", "Documents aren't set up on this server yet.", 503);
  const { error } = await bucket.remove([path]);
  if (error) {
    console.error(`mytrip-documents: delete failed: ${error.message}`);
    return fail(isUnavailable(error) ? "storage_unavailable" : "upload_failed", "The document couldn't be removed — try again.", 502);
  }
  return NextResponse.json({ ok: true });
}
