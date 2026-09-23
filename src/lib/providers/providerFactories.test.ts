import { afterEach, describe, expect, it } from "vitest";
import { getRoutingProvider } from "@/lib/providers/routing";
import { getWeatherProvider } from "@/lib/providers/weather";
import { getPlacesProvider } from "@/lib/providers/places";
import { getImageProvider } from "@/lib/providers/images";
import { MockRoutingProvider } from "@/lib/providers/routing/mockRouting";
import { GoogleMapsRoutingProvider } from "@/lib/providers/routing/googleMaps";
import { MockWeatherProvider } from "@/lib/providers/weather/mockWeather";
import { OpenWeatherMapProvider } from "@/lib/providers/weather/openWeatherMap";
import { MockPlacesProvider } from "@/lib/providers/places/mockPlaces";
import { GooglePlacesProvider } from "@/lib/providers/places/googlePlaces";
import { MockImageProvider } from "@/lib/providers/images/mockImages";
import { PexelsImageProvider } from "@/lib/providers/images/pexelsImages";
import { getFlightProvider } from "@/lib/providers/flights";
import { MockFlightProvider } from "@/lib/providers/flights/mockFlights";
import { AviationStackProvider } from "@/lib/providers/flights/aviationStack";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("provider factories — PRD Rule 4 (never hard-code a provider)", () => {
  it("routing: falls back to the mock provider with no API key, real adapter once one is set", () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    expect(getRoutingProvider()).toBeInstanceOf(MockRoutingProvider);

    process.env.GOOGLE_MAPS_API_KEY = "test-key";
    expect(getRoutingProvider()).toBeInstanceOf(GoogleMapsRoutingProvider);
  });

  it("weather: falls back to the mock provider with no API key, real adapter once one is set", () => {
    delete process.env.WEATHER_API_KEY;
    expect(getWeatherProvider()).toBeInstanceOf(MockWeatherProvider);

    process.env.WEATHER_API_KEY = "test-key";
    expect(getWeatherProvider()).toBeInstanceOf(OpenWeatherMapProvider);
  });

  it("places: falls back to the mock provider with no API key, real adapter once one is set", () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    expect(getPlacesProvider()).toBeInstanceOf(MockPlacesProvider);

    process.env.GOOGLE_MAPS_API_KEY = "test-key";
    expect(getPlacesProvider()).toBeInstanceOf(GooglePlacesProvider);
  });

  it("images: falls back to the mock provider with no API key, real adapter once one is set", () => {
    delete process.env.PEXELS_API_KEY;
    expect(getImageProvider()).toBeInstanceOf(MockImageProvider);

    process.env.PEXELS_API_KEY = "test-key";
    expect(getImageProvider()).toBeInstanceOf(PexelsImageProvider);
  });

  it("flights: falls back to the mock provider with no API key, real adapter once one is set", () => {
    delete process.env.AVIATIONSTACK_API_KEY;
    expect(getFlightProvider()).toBeInstanceOf(MockFlightProvider);

    process.env.AVIATIONSTACK_API_KEY = "test-key";
    expect(getFlightProvider()).toBeInstanceOf(AviationStackProvider);
  });
});

describe("MockFlightProvider", () => {
  it("tags mock data with provider 'mock' (PRD Rule 5 demo badge) and is deterministic per flight number", async () => {
    const provider = new MockFlightProvider();
    const a = await provider.getStatus({ flightNumber: "AA1523" });
    const b = await provider.getStatus({ flightNumber: "aa 1523" });
    expect(a?.provider).toBe("mock");
    expect(a?.flightNumber).toBe("AA1523");
    expect(a?.status).toBe(b?.status);
    expect(a?.departureGate).toBe(b?.departureGate);
  });
});

describe("MockImageProvider", () => {
  it("tags mock data with provider 'mock' (PRD Rule 5 demo badge) and returns usable results", async () => {
    const provider = new MockImageProvider();
    const results = await provider.search("Great Smoky Mountains");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.provider === "mock")).toBe(true);
    expect(results.every((r) => r.url.startsWith("https://"))).toBe(true);
  });
});

describe("MockRoutingProvider", () => {
  it("is deterministic for the same origin/destination", async () => {
    const provider = new MockRoutingProvider();
    const a = await provider.calculateRoute({ origin: "Dallas, TX", destination: "Denver, CO", travelMode: "driving" });
    const b = await provider.calculateRoute({ origin: "Dallas, TX", destination: "Denver, CO", travelMode: "driving" });
    expect(a.distanceMeters).toBe(b.distanceMeters);
    expect(a.estimatedDurationSeconds).toBe(b.estimatedDurationSeconds);
    expect(a.provider).toBe("mock");
  });
});

describe("MockWeatherProvider", () => {
  it("tags mock data with source 'mock' equivalent (provider field) for the Rule 5 demo badge", async () => {
    const provider = new MockWeatherProvider();
    const forecast = await provider.getForecast({ latitude: 39.7, longitude: -104.99, forecastFor: new Date().toISOString() });
    expect(forecast.provider).toBe("mock");
    expect(forecast.precipitationChance).toBeGreaterThanOrEqual(0);
    expect(forecast.precipitationChance).toBeLessThanOrEqual(100);
  });
});
