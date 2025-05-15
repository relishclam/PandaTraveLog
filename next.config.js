// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed static export which was causing issues with dynamic routes
  // output: 'export',
  
  // Configure image domains if you have any external images
  images: {
    unoptimized: true, // Required when using 'export'
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Disable React strict mode during development if needed
  reactStrictMode: true,
};

module.exports = nextConfig;