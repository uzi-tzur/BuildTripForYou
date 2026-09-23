import type { ImageProvider, ImageSearchResult } from "./ImageProvider";

/**
 * Deterministic placeholder photos used when PEXELS_API_KEY isn't set.
 * Lorem Picsum has no search — these are NOT actually related to the
 * query — always shown with a "Demo photos" badge (PRD Rule 5).
 */
export class MockImageProvider implements ImageProvider {
  async search(query: string): Promise<ImageSearchResult[]> {
    const seed = encodeURIComponent(query.trim().toLowerCase() || "travel");
    return Array.from({ length: 6 }, (_, i) => {
      const photoSeed = `${seed}-${i}`;
      return {
        url: `https://picsum.photos/seed/${photoSeed}/1600/900`,
        thumbUrl: `https://picsum.photos/seed/${photoSeed}/320/180`,
        photographer: "Lorem Picsum",
        photographerUrl: "https://picsum.photos",
        sourceUrl: "https://picsum.photos",
        provider: "mock",
      };
    });
  }
}
