export interface ImageSearchResult {
  /** Full-size image, suitable as a hero background. */
  url: string;
  /** Small preview for a result picker grid. */
  thumbUrl: string;
  photographer: string;
  photographerUrl: string;
  /** Link back to the photo's page — kept for attribution. */
  sourceUrl: string;
  provider: string;
}

/** Provider abstraction for trip hero-photo search, same pattern as WeatherProvider/RoutingProvider. */
export interface ImageProvider {
  search(query: string): Promise<ImageSearchResult[]>;
}
