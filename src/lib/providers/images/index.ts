import { MockImageProvider } from "./mockImages";
import { PexelsImageProvider } from "./pexelsImages";
import type { ImageProvider } from "./ImageProvider";

export type { ImageProvider, ImageSearchResult } from "./ImageProvider";

export function getImageProvider(): ImageProvider {
  return process.env.PEXELS_API_KEY ? new PexelsImageProvider() : new MockImageProvider();
}
