/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:8081/api/:path*" },
      { source: "/ws", destination: "http://localhost:8081/ws" },
    ];
  },
};
module.exports = nextConfig;
