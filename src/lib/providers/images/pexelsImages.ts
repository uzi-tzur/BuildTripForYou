import type { ImageProvider, ImageSearchResult } from "./ImageProvider";

interface PexelsPhoto {
  src: { large2x: string; medium: string };
  photographer: string;
  photographer_url: string;
  url: string;
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[];
}

/** Pexels search API — free, no attribution legally required (unlike Unsplash), generous rate limit. Requires PEXELS_API_KEY. */
export class PexelsImageProvider implements ImageProvider {
  private get apiKey(): string {
    const key = process.env.PEXELS_API_KEY;
    if (!key) throw new Error("PEXELS_API_KEY is not set.");
    return key;
  }

  async search(query: string): Promise<ImageSearchResult[]> {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "9");
    url.searchParams.set("orientation", "landscape");

    const response = await fetch(url, { headers: { Authorization: this.apiKey } });
    if (!response.ok) {
      throw new Error(`Pexels search failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as PexelsSearchResponse;
    return data.photos.map((photo) => ({
      url: photo.src.large2x,
      thumbUrl: photo.src.medium,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      sourceUrl: photo.url,
      provider: "pexels",
    }));
  }
}
