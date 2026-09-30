import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDuration, formatMiles } from "@/lib/driveTime";
import { POST } from "./route";

function call(body: unknown) {
  return POST(new Request("http://localhost/api/drive-time", { method: "POST", body: JSON.stringify(body) }));
}

const STOPS = { origin: "Red Rocks Amphitheatre, Morrison, CO", destination: "Golden, CO" };

beforeEach(() => {
  process.env.GOOGLE_MAPS_API_KEY = "test-key";
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GOOGLE_MAPS_API_KEY;
});

describe("POST /api/drive-time", () => {
  it("rejects missing addresses", async () => {
    const res = await call({ origin: "Golden, CO" });
    expect(res.status).toBe(400);
  });

  it("reports not_configured — never a made-up time — when there is no Google Maps key", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await call(STOPS);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "not_configured" } });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns Google's traffic-aware duration and distance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ routes: [{ duration: "1260s", distanceMeters: 16093 }] }))),
    );
    const res = await call(STOPS);
    expect(await res.json()).toEqual({ ok: true, durationSeconds: 1260, distanceMeters: 16093 });
  });

  it("reports unavailable when Google fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    const res = await call(STOPS);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "unavailable" } });
  });
});

describe("drive time formatting", () => {
  it("formats durations", () => {
    expect(formatDuration(20)).toBe("1 min");
    expect(formatDuration(1260)).toBe("21 min");
    expect(formatDuration(3600)).toBe("1 hr");
    expect(formatDuration(4800)).toBe("1 hr 20 min");
  });

  it("formats distances in miles", () => {
    expect(formatMiles(35406)).toBe("22 mi");
    expect(formatMiles(8047)).toBe("5.0 mi");
  });
});
