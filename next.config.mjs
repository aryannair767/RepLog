import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  fallbacks: {
    document: "/~offline",
  },
  workboxOptions: {
    // We add an explicit rule for Supabase to be NetworkFirst
    // All other standard static assets (CacheFirst) and API (NetworkFirst)
    // are automatically handled by the defaults of next-pwa.
    runtimeCaching: [
      {
        urlPattern: /^https?:\/\/.*\.supabase\.co\/.*$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "supabase-api-cache",
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
