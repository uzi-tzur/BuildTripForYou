import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectImageType, isTripPhotoUrl } from "@/lib/tripPhotos";

const upload = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload,
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://abc.supabase.co/storage/v1/object/public/trip-photos/${path}` },
        }),
      }),
    },
  }),
}));

const { POST } = await import("./route");

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);

function send(bytes: Uint8Array<ArrayBuffer> | null) {
  const form = new FormData();
  if (bytes) form.append("photo", new File([bytes], "photo.jpg", { type: "image/jpeg" }));
  return POST(new Request("http://localhost/api/photo-upload", { method: "POST", body: form }));
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  upload.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("POST /api/photo-upload", () => {
  it("stores a JPEG under a random name and returns its public URL", async () => {
    const res = await send(JPEG);
    const body = (await res.json()) as { ok: boolean; url: string };
    expect(body.ok).toBe(true);
    expect(isTripPhotoUrl(body.url)).toBe(true);
    expect(body.url).toMatch(/\/trip-photos\/[0-9a-f-]{36}\.jpg$/);
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/\.jpg$/), expect.any(Uint8Array), { contentType: "image/jpeg", upsert: false });
  });

  it("says uploads aren't set up when the service-role key is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await send(JPEG);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "not_configured" } });
  });

  it("rejects a missing photo and a file that isn't really an image", async () => {
    expect((await send(null)).status).toBe(400);
    const res = await send(new TextEncoder().encode("<html>not a photo</html>"));
    expect(res.status).toBe(415);
    expect(upload).not.toHaveBeenCalled();
  });

  it("reports upload_failed when storage refuses the file", async () => {
    upload.mockResolvedValue({ error: { message: "Bucket not found" } });
    const res = await send(JPEG);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "upload_failed" } });
  });
});

describe("trip photo helpers", () => {
  it("accepts only public trip-photos URLs on Supabase", () => {
    expect(isTripPhotoUrl("https://abc.supabase.co/storage/v1/object/public/trip-photos/x.jpg")).toBe(true);
    expect(isTripPhotoUrl("http://abc.supabase.co/storage/v1/object/public/trip-photos/x.jpg")).toBe(false);
    expect(isTripPhotoUrl("https://abc.supabase.co/storage/v1/object/public/other/x.jpg")).toBe(false);
    expect(isTripPhotoUrl("https://evil.example.com/storage/v1/object/public/trip-photos/x.jpg")).toBe(false);
  });

  it("detects images by their bytes", () => {
    expect(detectImageType(JPEG)).toEqual({ mime: "image/jpeg", ext: "jpg" });
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toEqual({ mime: "image/png", ext: "png" });
    expect(detectImageType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toEqual({ mime: "image/webp", ext: "webp" });
    expect(detectImageType(new TextEncoder().encode("GIF89a"))).toBeNull();
  });
});
