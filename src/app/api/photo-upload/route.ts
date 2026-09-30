import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  detectImageType,
  MAX_PHOTO_BYTES,
  TRIP_PHOTOS_BUCKET,
  type PhotoUploadApiResponse,
  type PhotoUploadErrorCode,
} from "@/lib/tripPhotos";

/** A pasted key often picks up spaces, a line break or quotes — any of which make Supabase reject it ("Invalid Compact JWS"). */
function cleanKey(raw: string | undefined): string | undefined {
  return raw?.trim().replace(/^["']|["']$/g, "").trim() || undefined;
}

/** What kind of key is configured — for the logs, without ever logging the key itself. */
function describeKey(key: string): string {
  const kind = key.startsWith("sb_secret_")
    ? "secret key (sb_secret_…)"
    : key.startsWith("sb_publishable_")
      ? "PUBLISHABLE key — wrong key, use the secret one"
      : key.startsWith("eyJ") && key.split(".").length === 3
        ? "legacy JWT key (should be service_role, not anon)"
        : "unrecognized value — not a Supabase API key";
  return `${kind}, ${key.length} chars`;
}

function fail(code: PhotoUploadErrorCode, message: string, status: number) {
  const body: PhotoUploadApiResponse = { ok: false, error: { code, message } };
  return NextResponse.json(body, { status });
}

/**
 * Stores a photo the user picked from their phone (trip cover or activity
 * photo) in the public trip-photos bucket and returns its URL. It's the one
 * place SUPABASE_SERVICE_ROLE_KEY is used, server-side only, behind the
 * /my-trip access-code gate (src/middleware.ts) — the bucket itself accepts
 * no uploads from the public anon key.
 */
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceKey) return fail("not_configured", "Photo uploads aren't set up on this server yet.", 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("invalid_request", "Send the photo as form data.", 400);
  }
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return fail("invalid_request", "No photo was sent.", 400);
  if (file.size > MAX_PHOTO_BYTES) return fail("too_large", "That photo is too large.", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) return fail("unsupported_type", "Only JPEG, PNG or WebP photos can be uploaded.", 415);

  const path = `${crypto.randomUUID()}.${type.ext}`;
  const storage = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }).storage.from(TRIP_PHOTOS_BUCKET);
  const { error } = await storage.upload(path, bytes, { contentType: type.mime, upsert: false });
  if (error) {
    console.error(`photo-upload: Supabase Storage upload failed: ${error.message} [SUPABASE_SERVICE_ROLE_KEY: ${describeKey(serviceKey)}]`);
    return fail("upload_failed", "The photo couldn't be saved — try again.", 502);
  }

  const payload: PhotoUploadApiResponse = { ok: true, url: storage.getPublicUrl(path).data.publicUrl };
  return NextResponse.json(payload);
}
