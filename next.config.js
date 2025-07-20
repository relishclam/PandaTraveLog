/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove output: 'export'
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
  
  // Remove trailingSlash for SSR
  // trailingSlash: true,
  
  experimental: {
    esmExternals: false,
  },
};

module.exports = nextConfig;