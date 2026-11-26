import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanDocumentName, detectDocumentType, isDocumentPath, sanitizeDocuments } from "@/lib/tripDocuments";

const { upload, createSignedUrl, remove, createClient, fromBucket } = vi.hoisted(() => {
  const upload = vi.fn();
  const createSignedUrl = vi.fn();
  const remove = vi.fn();
  const fromBucket = vi.fn(() => ({ upload, createSignedUrl, remove }));
  const createClient = vi.fn(() => ({ storage: { from: fromBucket } }));
  return { upload, createSignedUrl, remove, createClient, fromBucket };
});
vi.mock("@supabase/supabase-js", () => ({ createClient }));

const { POST, GET, DELETE } = await import("./route");

const PDF = new TextEncoder().encode("%PDF-1.7\n%âãÏÓ\n1 0 obj");
const PATH = "3f2c1b4a-1234-4abc-8def-0123456789ab.pdf";

function send(bytes: Uint8Array<ArrayBuffer>, name = "Tokyo insurance.pdf") {
  const form = new FormData();
  form.append("document", new File([bytes], name, { type: "application/pdf" }));
  return POST(new Request("http://localhost/api/mytrip-documents", { method: "POST", body: form }));
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_x";
  upload.mockReset().mockResolvedValue({ error: null });
  createSignedUrl.mockReset().mockResolvedValue({ data: { signedUrl: "https://abc.supabase.co/storage/v1/object/sign/trip-documents/x?token=t" }, error: null });
  remove.mockReset().mockResolvedValue({ error: null });
  fromBucket.mockClear();
});
afterEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("/api/mytrip-documents", () => {
  it("stores a PDF in the private bucket under a random name and returns its record", async () => {
    const res = await send(PDF);
    const body = (await res.json()) as { ok: boolean; document: { path: string; name: string; mime: string; size: number } };
    expect(body.ok).toBe(true);
    expect(isDocumentPath(body.document.path)).toBe(true);
    expect(body.document).toMatchObject({ name: "Tokyo insurance.pdf", mime: "application/pdf", size: PDF.length });
    expect(fromBucket).toHaveBeenCalledWith("trip-documents");
    expect(upload).toHaveBeenCalledWith(body.document.path, expect.any(Uint8Array), { contentType: "application/pdf", upsert: false });
  });

  it("refuses a file that isn't really a PDF or image", async () => {
    const res = await send(new TextEncoder().encode("<html>nope</html>"), "fake.pdf");
    expect(res.status).toBe(415);
    expect(upload).not.toHaveBeenCalled();
  });

  it("says storage is offline when Supabase can't be reached", async () => {
    upload.mockResolvedValue({ error: { message: "fetch failed" } });
    const res = await send(PDF);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "storage_unavailable" } });
  });

  it("opens a document through a short-lived private link, and only for paths this app created", async () => {
    const res = await GET(new Request(`http://localhost/api/mytrip-documents?path=${PATH}&name=x.pdf`));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/object/sign/trip-documents/");
    expect(createSignedUrl).toHaveBeenCalledWith(PATH, 300, { download: false });

    const bad = await GET(new Request("http://localhost/api/mytrip-documents?path=../trip-photos/x.jpg"));
    expect(bad.status).toBe(400);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it("deletes a document's file", async () => {
    const res = await DELETE(new Request(`http://localhost/api/mytrip-documents?path=${PATH}`, { method: "DELETE" }));
    expect(res.status).toBe(200);
    expect(remove).toHaveBeenCalledWith([PATH]);
  });

  it("says documents aren't set up without the service key", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect((await send(PDF)).status).toBe(503);
  });
});

describe("trip document helpers", () => {
  it("detects documents by their bytes", () => {
    expect(detectDocumentType(PDF)?.mime).toBe("application/pdf");
    expect(detectDocumentType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe("jpg");
    expect(detectDocumentType(new TextEncoder().encode("GIF89a"))).toBeNull();
  });

  it("keeps only well-formed document records", () => {
    const good = { path: PATH, name: "ביטוח.pdf", size: 1200, mime: "application/pdf", uploadedAt: "2026-11-26T10:00:00Z" };
    expect(sanitizeDocuments([good, good, { ...good, path: "x.pdf" }, { ...good, path: PATH.replace("3f", "4f"), mime: "text/html" }])).toEqual([good]);
    expect(sanitizeDocuments("nope")).toEqual([]);
  });

  it("cleans file names", () => {
    expect(cleanDocumentName("C:\\fakepath\\policy.pdf")).toBe("policy.pdf");
    expect(cleanDocumentName('a"b\u0007.pdf')).toBe("ab.pdf");
    expect(cleanDocumentName("")).toBe("Document");
  });
});
