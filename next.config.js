/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: '/api/po/chat',
        destination: '/api/assistant/chat',
      }
    ];
  },
  
  experimental: {
    esmExternals: false,
  },
};

module.exports = nextConfig;