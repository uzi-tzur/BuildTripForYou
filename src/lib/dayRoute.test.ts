import { describe, expect, it } from "vitest";
import { buildDayRoute, MAX_ROUTE_STOPS, routeStopQuery } from "@/lib/dayRoute";
import { isValidGoogleMapsUrl } from "@/lib/stopOverrides";

describe("routeStopQuery", () => {
  it("uses the address, or else the activity's name in the day's area", () => {
    expect(routeStopQuery({ address: "1 Main St, Boone, NC", name: "Lunch" }, "Boone, North Carolina, US")).toBe("1 Main St, Boone, NC");
    expect(routeStopQuery({ address: null, name: "Grandfather Mountain" }, "Boone, North Carolina, US")).toBe(
      "Grandfather Mountain, Boone, North Carolina, US",
    );
    expect(routeStopQuery({ address: "  ", name: "Linville Falls" }, null)).toBe("Linville Falls");
    expect(routeStopQuery({ address: null, name: " " }, "Boone")).toBeNull();
  });
});

describe("buildDayRoute", () => {
  it("routes from the first to the last address through the ones between, in order", () => {
    const route = buildDayRoute(["Senso-ji, Tokyo", null, "Tokyo Skytree", "  ", "Shibuya Crossing"]);
    expect(route?.stopCount).toBe(3);
    const url = new URL(route!.url);
    expect(isValidGoogleMapsUrl(route!.url)).toBe(true);
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("origin")).toBe("Senso-ji, Tokyo");
    expect(url.searchParams.get("waypoints")).toBe("Tokyo Skytree");
    expect(url.searchParams.get("destination")).toBe("Shibuya Crossing");
  });

  it("needs at least two different places", () => {
    expect(buildDayRoute([])).toBeNull();
    expect(buildDayRoute(["Hotel Gracery"])).toBeNull();
    expect(buildDayRoute(["Hotel Gracery", "hotel gracery"])).toBeNull();
  });

  it("caps the route at Google Maps' stop limit and says how many were left out", () => {
    const addresses = Array.from({ length: MAX_ROUTE_STOPS + 2 }, (_, i) => `Place ${i + 1}`);
    const route = buildDayRoute(addresses)!;
    expect(route.stopCount).toBe(MAX_ROUTE_STOPS);
    expect(route.omittedCount).toBe(2);
    expect(new URL(route.url).searchParams.get("waypoints")?.split("|")).toHaveLength(MAX_ROUTE_STOPS - 2);
  });
});
