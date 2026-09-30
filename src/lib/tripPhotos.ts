/**
 * Photos users upload from their phone (trip cover or activity photo),
 * stored in the public Supabase Storage bucket created by
 * supabase/migrations/0012_trip_photos_bucket.sql.
 */
export const TRIP_PHOTOS_BUCKET = "trip-photos";

/** Photos are shrunk on the phone before upload, so this is generous — and under Vercel's 4.5 MB request limit. */
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export type PhotoUploadErrorCode = "invalid_request" | "too_large" | "unsupported_type" | "not_configured" | "upload_failed";

export type PhotoUploadApiResponse =
  | { ok: true; url: string }
  | { ok: false; error: { code: PhotoUploadErrorCode; message: string } };

const PUBLIC_PATH_PREFIX = `/storage/v1/object/public/${TRIP_PHOTOS_BUCKET}/`;

/** A public URL of an uploaded trip photo — the only Supabase URLs the app will render (see next.config.ts). */
export function isTripPhotoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".supabase.co") && url.pathname.startsWith(PUBLIC_PATH_PREFIX);
  } catch {
    return false;
  }
}

/** Identifies the image by its first bytes rather than trusting the declared type. */
export function detectImageType(bytes: Uint8Array): { mime: string; ext: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mime: "image/png", ext: "png" };
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}
