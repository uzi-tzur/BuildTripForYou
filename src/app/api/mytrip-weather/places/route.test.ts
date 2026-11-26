import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const fetchMock = vi.fn();

function search(q: string) {
  return GET(new Request(`http://localhost/api/mytrip-weather/places?q=${encodeURIComponent(q)}`));
}

beforeEach(() => {
  process.env.WEATHER_API_KEY = "test-key";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  delete process.env.WEATHER_API_KEY;
  vi.unstubAllGlobals();
});

describe("GET /api/mytrip-weather/places", () => {
  it("returns matching places named with their region and country", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          { name: "Tokyo", lat: 35.68, lon: 139.76, country: "JP" },
          { name: "Tokyo", lat: 35.68, lon: 139.76, country: "JP" },
          { name: "Tokyo", lat: 33.1, lon: -96.1, country: "US", state: "Texas" },
        ]),
      ),
    );
    const res = await search("Tokyo");
    expect(await res.json()).toEqual({
      ok: true,
      places: [
        { name: "Tokyo, JP", latitude: 35.68, longitude: 139.76 },
        { name: "Tokyo, Texas, US", latitude: 33.1, longitude: -96.1 },
      ],
    });
    const url = new URL(fetchMock.mock.calls[0]?.[0] as URL);
    expect(url.hostname).toBe("api.openweathermap.org");
    expect(url.searchParams.get("q")).toBe("Tokyo");
  });

  it("rejects an empty search without calling the weather service", async () => {
    expect((await search(" ")).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("says weather isn't set up when there's no API key", async () => {
    delete process.env.WEATHER_API_KEY;
    const res = await search("Tokyo");
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "not_configured" } });
  });

  it("reports search_failed when the weather service errors", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 500 }));
    const res = await search("Tokyo");
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "search_failed" } });
  });
});
