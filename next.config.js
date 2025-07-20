/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Add this line
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
  
  trailingSlash: true,
  
  // Remove this experimental setting for static export
  // experimental: {
  //   esmExternals: false,
  // },
};

module.exports = nextConfig;