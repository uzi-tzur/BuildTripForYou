import { describe, expect, it } from "vitest";
import { isValidGoogleMapsUrl, normalizeWebsiteUrl } from "@/lib/stopOverrides";

describe("isValidGoogleMapsUrl", () => {
  it("accepts a full multi-stop directions link", () => {
    expect(
      isValidGoogleMapsUrl(
        "https://www.google.com/maps/dir/Denver+International+Airport,+8500+Pe%C3%B1a+Blvd,+Denver,+CO+80249/3301+Tower+Rd,+Aurora,+CO+80011/@39.35,-105.46,9z/data=!3m1!4b1?entry=ttu",
      ),
    ).toBe(true);
  });

  it("accepts short share links", () => {
    expect(isValidGoogleMapsUrl("https://maps.app.goo.gl/abc123")).toBe(true);
    expect(isValidGoogleMapsUrl("https://goo.gl/maps/abc123")).toBe(true);
  });

  it("rejects non-https, non-Google, and non-maps links", () => {
    expect(isValidGoogleMapsUrl("javascript:alert(1)")).toBe(false);
    expect(isValidGoogleMapsUrl("http://www.google.com/maps/dir/a/b")).toBe(false);
    expect(isValidGoogleMapsUrl("https://evil.example.com/maps/dir/a/b")).toBe(false);
    expect(isValidGoogleMapsUrl("https://www.google.com/url?q=https://evil.example.com")).toBe(false);
    expect(isValidGoogleMapsUrl("not a url")).toBe(false);
  });
});

describe("normalizeWebsiteUrl", () => {
  it("keeps http(s) links and adds https:// to a bare domain", () => {
    expect(normalizeWebsiteUrl("https://www.nps.gov/romo/index.htm")).toBe("https://www.nps.gov/romo/index.htm");
    expect(normalizeWebsiteUrl("  nps.gov/romo ")).toBe("https://nps.gov/romo");
    expect(normalizeWebsiteUrl("http://example.com")).toBe("http://example.com/");
  });

  it("rejects non-web links and junk", () => {
    expect(normalizeWebsiteUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeWebsiteUrl("data:text/html,hi")).toBeNull();
    expect(normalizeWebsiteUrl("not a link")).toBeNull();
    expect(normalizeWebsiteUrl("")).toBeNull();
  });
});
