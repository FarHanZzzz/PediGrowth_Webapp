import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy pipeline API calls to the Python backend
  async rewrites() {
    return [
      {
        source: "/api/pipeline/:path*",
        destination: `${process.env.GAIT_PIPELINE_API_URL || "http://localhost:8000"}/:path*`,
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
