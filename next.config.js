// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Disable image optimization for Netlify deployment
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Ensure static export compatibility
  trailingSlash: true,
  
  // Disable server-side features that don't work on Netlify
  experimental: {
    esmExternals: false,
  },
};

module.exports = nextConfig;