/** @type {import('next').NextConfig} */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8081";

const nextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_BASE}/api/:path*` },
      { source: "/ws", destination: `${API_BASE}/ws` },
    ];
  },
};

module.exports = nextConfig;
