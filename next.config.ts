import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Trip hero photos chosen via the image-search feature (src/lib/providers/images).
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "picsum.photos" },
      // Photos users upload from their phone (src/lib/tripPhotos.ts).
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/trip-photos/**" },
    ],
  },
};

export default nextConfig;
