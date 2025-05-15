// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // You need this setting for Netlify deployments
  output: 'export',
  
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