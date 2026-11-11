import type { NextConfig } from "next";

const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co");

const nextConfig: NextConfig = {
  images: {
    // Seeded pictures live in /public/catalog; uploads live in Supabase Storage.
    localPatterns: [{ pathname: "/catalog/**" }],
    remotePatterns: [{ protocol: "https", hostname: supabase.hostname, pathname: "/storage/v1/object/public/catalog/**" }],
    // A short list of sizes keeps the number of resized variants (and the bill) small.
    deviceSizes: [640, 960, 1280],
    imageSizes: [64, 128, 256, 384],
    formats: ["image/webp"],
    minimumCacheTTL: 2678400,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
